import type { Collection } from 'tinacms';

export const page: Collection = {
  name: 'page',
  label: 'Pages',
  path: 'content/pages',
  format: 'json',
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'string',
      required: true,
    },
    {
      name: 'description',
      label: 'Description',
      type: 'string',
      ui: {
        component: 'textarea',
      },
    },
    {
      name: 'seo',
      label: 'SEO',
      type: 'object',
      fields: [
        { name: 'title', label: 'SEO Title', type: 'string' },
        {
          name: 'description',
          label: 'SEO Description',
          type: 'string',
          ui: { component: 'textarea' },
        },
        { name: 'image', label: 'OG Image', type: 'image' },
      ],
    },
    {
      name: 'body',
      label: 'Body',
      type: 'rich-text',
    },
  ],
};
