/**
 * Reproduction: plugin-mcp's update tools reject array row ids, so a write in
 * one locale wipes the localized labels of every other locale.
 *
 *   pnpm dev      (terminal 1)
 *   pnpm seed     (once)
 *   pnpm repro    (terminal 2) -> exits 1 while the bug exists
 */
const BASE = process.env.BASE_URL ?? 'http://localhost:3000'
const API_KEY = 'repro-mcp-key-0000000000000000' // created by scripts/seed.ts

let rpcId = 0
async function callTool(name, args) {
  const res = await fetch(`${BASE}/api/mcp`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method: 'tools/call', params: { name, arguments: args } }),
  })
  const raw = await res.text()
  // Streamable HTTP may answer as SSE: take the last `data:` line.
  const json = raw.trimStart().startsWith('{')
    ? JSON.parse(raw)
    : JSON.parse(raw.split('\n').filter((l) => l.startsWith('data:')).pop().slice(5))
  if (json.error) return { error: json.error.message }
  const text = json.result.content.map((c) => c.text).join('\n')
  return json.result.isError ? { error: text } : { text }
}

async function footerAllLocales() {
  const res = await fetch(`${BASE}/api/globals/footer?locale=all&depth=0`)
  return (await res.json()).links
}

const show = (label, v) => console.log(`\n## ${label}\n${typeof v === 'string' ? v : JSON.stringify(v, null, 2)}`)

show('Before: footer.links (locale: all)', await footerAllLocales())

// 1. Read en through MCP, like any client does.
const found = await callTool('findFooter', { locale: 'en' })
const rows = JSON.parse(found.text.match(/```json\n([\s\S]*?)\n```/)[1]).links
show('findFooter (en) returns rows WITH ids', rows)

// 2. Write one en label back, keeping the row ids (the shape that preserves de).
const withIds = rows.map((r, i) => ({ id: r.id, href: r.href, label: i === 0 ? 'Photo gallery' : r.label }))
const a = await callTool('updateFooter', { locale: 'en', links: withIds })
show('updateFooter (en) WITH row ids', a.error ?? 'ok')

if (!a.error) {
  const after = await footerAllLocales()
  show('After: footer.links (locale: all)', after)
  const ok = after.every((row) => row.label?.de)
  console.log(ok ? '\nOK: rows kept their ids and the de labels survived the en write.' : '\nBUG: de labels lost.')
  process.exit(ok ? 0 : 1)
}

// 3. Rejected: the only shape the tool schema accepts is rows without ids.
const withoutIds = withIds.map(({ id, ...rest }) => rest)
const b = await callTool('updateFooter', { locale: 'en', links: withoutIds })
show('updateFooter (en) WITHOUT row ids (the only accepted shape)', b.error ?? 'ok')

const after = await footerAllLocales()
show('After: footer.links (locale: all)', after)
console.log('\nBUG: row ids are rejected, and the accepted write wiped the de labels (rows were recreated with new ids).')
process.exit(1)
