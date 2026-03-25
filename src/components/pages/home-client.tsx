'use client';

import { useTina } from 'tinacms/dist/react';
import { tinaField } from 'tinacms/dist/react';
import { TinaMarkdown } from 'tinacms/dist/rich-text';

export default function HomeClient(props: any) {
  const { data } = useTina({
    query: props.query,
    variables: props.variables,
    data: props.data,
  });

  const page = data.page;

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl">
      <h1
        data-tina-field={tinaField(page, 'title')}
        className="text-4xl font-bold tracking-tight"
      >
        {page.title}
      </h1>
      {page.description && (
        <p
          data-tina-field={tinaField(page, 'description')}
          className="mt-4 text-lg text-gray-600 dark:text-gray-400"
        >
          {page.description}
        </p>
      )}
      {page.body && (
        <div
          data-tina-field={tinaField(page, 'body')}
          className="mt-8 prose dark:prose-invert max-w-none"
        >
          <TinaMarkdown content={page.body} />
        </div>
      )}
    </div>
  );
}
