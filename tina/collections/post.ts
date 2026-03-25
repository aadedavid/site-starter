import type { Collection } from 'tinacms';

export const post: Collection = {
  name: 'post',
  label: 'Blog Posts',
  path: 'content/posts',
  format: 'md',
  fields: [
    {
      name: 'title',
      label: 'Title',
      type: 'string',
      required: true,
    },
    {
      name: 'date',
      label: 'Date',
      type: 'datetime',
      required: true,
    },
    {
      name: 'author',
      label: 'Author',
      type: 'string',
    },
    {
      name: 'excerpt',
      label: 'Excerpt',
      type: 'string',
      ui: {
        component: 'textarea',
      },
    },
    {
      name: 'coverImage',
      label: 'Cover Image',
      type: 'image',
    },
    {
      name: 'body',
      label: 'Body',
      type: 'rich-text',
      isBody: true,
    },
  ],
};
