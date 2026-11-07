# plugin-mcp: array row ids are rejected, so one locale's write wipes the others

Minimal reproduction for `@payloadcms/plugin-mcp` **3.93.0** (latest), with `db-sqlite` (no database server needed).

## The bug

`sanitizeJsonSchema` (`packages/plugin-mcp/src/utils/schemaConversion/sanitizeJsonSchema.ts`) removes `id` from the
document root **and from every nested array item**. The generated tool schema is strict, so `update*` tools reject
array rows that carry their `id`:

```
MCP error -32602: Input validation error: Invalid arguments for tool updateFooter:
Unrecognized key(s) in object: 'id' at links[0]
```

For a **non-localized array with localized subfields** (the usual translated link list) the only accepted write is
rows without ids. Payload then recreates every row, and the localized values of **all other locales are lost**.

## Setup

- `src/globals/Footer.ts`: `links` array (not localized), `label` localized, `href` shared.
- `src/payload.config.ts`: locales `en` + `de`, `mcpPlugin` with the footer global enabled.
- `scripts/seed.ts`: a user, an MCP API key, and footer rows with `en` + `de` labels on the same rows (Local API, by id: works).
- `scripts/repro.mjs`: drives the real `/api/mcp` endpoint.

## Run

```bash
pnpm install
cp .env.example .env
pnpm dev          # terminal 1
pnpm seed         # terminal 2
pnpm repro        # exits 1 while the bug exists
```

## Output (stock 3.93.0)

```
## Before: footer.links (locale: all)
[ { "id": "…d61", "href": "/gallery", "label": { "en": "Gallery", "de": "Galerie" } },
  { "id": "…d62", "href": "/reviews", "label": { "en": "Reviews", "de": "Bewertungen" } } ]

## updateFooter (en) WITH row ids
MCP error -32602: Input validation error: Invalid arguments for tool updateFooter: Unrecognized key(s) in object: 'id' at links[0]

## updateFooter (en) WITHOUT row ids (the only accepted shape)
ok

## After: footer.links (locale: all)
[ { "id": "…34d", "href": "/gallery", "label": { "en": "Photo gallery" } },
  { "id": "…34e", "href": "/reviews", "label": { "en": "Reviews" } } ]

BUG: an en-only MCP write wiped the de labels (rows were recreated with new ids).
```

## Expected

Strip `id` / `createdAt` / `updatedAt` at the document root only; keep an **optional** `id` on nested array/block rows
so clients can address existing rows. Applying that change to `sanitizeJsonSchema` makes `pnpm repro` exit 0.
