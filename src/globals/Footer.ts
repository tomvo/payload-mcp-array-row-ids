import type { GlobalConfig } from 'payload'

/**
 * A NON-localized array whose subfields are localized: the rows (and hrefs) are
 * shared by every locale, only the labels are translated. This is the standard
 * way to model translated nav/footer link lists.
 */
export const Footer: GlobalConfig = {
  slug: 'footer',
  access: { read: () => true, update: () => true },
  fields: [
    {
      name: 'links',
      type: 'array',
      fields: [
        { name: 'label', type: 'text', required: true, localized: true },
        { name: 'href', type: 'text', required: true },
      ],
    },
  ],
}
