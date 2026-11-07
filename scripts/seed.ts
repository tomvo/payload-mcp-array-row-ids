/**
 * Seed: a user, an MCP API key (footer find + update) and a footer whose
 * labels exist in BOTH locales on the SAME rows.
 * Run with: pnpm seed
 */
import { getPayload } from 'payload'
import config from '@payload-config'

export const API_KEY = 'repro-mcp-key-0000000000000000'

const payload = await getPayload({ config })

let user = (await payload.find({ collection: 'users', limit: 1 })).docs[0]
if (!user) {
  user = await payload.create({
    collection: 'users',
    data: { email: 'repro@example.com', password: 'repro-password' },
  })
}

const keys = await payload.find({ collection: 'payload-mcp-api-keys', limit: 100 })
for (const k of keys.docs) await payload.delete({ collection: 'payload-mcp-api-keys', id: k.id })
await payload.create({
  collection: 'payload-mcp-api-keys',
  data: {
    user: user.id,
    label: 'repro',
    enableAPIKey: true,
    apiKey: API_KEY,
    footer: { find: true, update: true },
  } as never,
})

// en creates the rows, de fills the labels on the same rows (by id).
const en = await payload.updateGlobal({
  slug: 'footer',
  locale: 'en',
  data: {
    links: [
      { label: 'Gallery', href: '/gallery' },
      { label: 'Reviews', href: '/reviews' },
    ],
  },
})
await payload.updateGlobal({
  slug: 'footer',
  locale: 'de',
  data: {
    links: en.links!.map((row, i) => ({
      id: row.id,
      href: row.href,
      label: ['Galerie', 'Bewertungen'][i],
    })),
  },
})

const all = await payload.findGlobal({ slug: 'footer', locale: 'all' })
console.log('Seeded footer (locale: all):\n' + JSON.stringify(all.links, null, 2))
process.exit(0)
