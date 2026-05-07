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

/* ── Layout ──────────────────────────────────────────────── */

body {
  font-family: theme(--font-sans);
  line-height: 1.6;
  color: #111827;
  max-width: 48rem;
  margin: 0 auto;
  padding: 2rem 1rem;
}

h1 {
  font-size: 2.25rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

p {
  margin-bottom: 1.5rem;
  color: #4b5563;
}

a {
  color: #2563eb;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

nav {
  display: flex;
  gap: 1rem;
}

/* ── Items ───────────────────────────────────────────────── */

.items-section {
  margin-top: 2.5rem;
  border-top: 1px solid #e5e7eb;
  padding-top: 1.5rem;
}

.items-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1rem;
}

.items-status {
  color: #6b7280;
  font-size: 0.875rem;
}

.items-error {
  color: #dc2626;
}

.items-grid {
  list-style: none;
  display: grid;
  gap: 0.75rem;
}

.item-card {
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  padding: 1rem;
}

.item-card h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0.25rem 0;
}

.item-card p {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

.badge {
  display: inline-block;
  font-size: 0.75rem;
  font-weight: 500;
  padding: 0.125rem 0.5rem;
  border-radius: 9999px;
}

.badge-done {
  background: #d1fae5;
  color: #065f46;
}

.badge-todo {
  background: #fef3c7;
  color: #92400e;
}

code {
  background: #f3f4f6;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
}
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
    devDependencies: {},
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
