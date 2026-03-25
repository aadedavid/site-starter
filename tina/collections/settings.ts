import type { Collection } from 'tinacms';

export const settings: Collection = {
  name: 'settings',
  label: 'Settings',
  path: 'content/settings',
  format: 'json',
  fields: [
    {
      name: 'siteName',
      label: 'Site Name',
      type: 'string',
      required: true,
    },
    {
      name: 'siteDescription',
      label: 'Site Description',
      type: 'string',
      ui: { component: 'textarea' },
    },
    {
      name: 'logo',
      label: 'Logo',
      type: 'image',
    },
    {
      name: 'socialLinks',
      label: 'Social Links',
      type: 'object',
      fields: [
        { name: 'github', label: 'GitHub', type: 'string' },
        { name: 'linkedin', label: 'LinkedIn', type: 'string' },
        { name: 'twitter', label: 'Twitter / X', type: 'string' },
        { name: 'instagram', label: 'Instagram', type: 'string' },
      ],
    },
    {
      name: 'footer',
      label: 'Footer',
      type: 'object',
      fields: [
        { name: 'text', label: 'Footer Text', type: 'string' },
      ],
    },
  ],
};
