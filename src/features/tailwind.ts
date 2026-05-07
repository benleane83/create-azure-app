import type { Feature, FileEntry } from '../composer.js';

type Framework = 'nextjs' | 'vite-react' | 'sveltekit';

interface TailwindOptions {
  framework: Framework;
}

const POSTCSS_CONFIG = `export default {
  plugins: {
    '@tailwindcss/postcss': {},
  },
};
`;

const TAILWIND_CSS = `@import "tailwindcss";
`;

/**
 * Tailwind CSS v4 feature — adds PostCSS config and replaces the
 * framework's global CSS file with Tailwind directives.
 *
 * Must be composed AFTER the framework feature so its CSS file
 * wins via last-write-wins in compose().
 */
export function tailwindFeature(config: TailwindOptions): Feature {
  const files: FileEntry[] = [
    {
      path: 'src/web/postcss.config.mjs',
      content: POSTCSS_CONFIG,
    },
    ...cssFiles(config.framework),
  ];

  return {
    name: 'tailwind',
    files,
    dependencies: {},
    devDependencies: {
      tailwindcss: '^4.0.0',
      '@tailwindcss/postcss': '^4.0.0',
    },
    scripts: {},
  };
}

function cssFiles(framework: Framework): FileEntry[] {
  switch (framework) {
    case 'nextjs':
      return [
        { path: 'src/web/app/globals.css', content: TAILWIND_CSS },
      ];

    case 'vite-react':
      return [
        { path: 'src/web/src/App.css', content: TAILWIND_CSS },
      ];

    case 'sveltekit':
      return [
        { path: 'src/web/src/app.css', content: TAILWIND_CSS },
        {
          path: 'src/web/src/routes/+layout.svelte',
          content: `<script lang="ts">
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
`,
        },
      ];
  }
}
