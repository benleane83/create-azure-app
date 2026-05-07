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

/* ── Base ────────────────────────────────────────────────── */

body {
  font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont,
    'Segoe UI', sans-serif;
  line-height: 1.6;
  color: #1e293b;
  background: #f8fafc;
}

/* ── Hero ─────────────────────────────────────────────────── */

.hero {
  background: #0f1729;
  color: #f1f5f9;
  padding: 4rem 2rem 5rem;
  text-align: center;
  position: relative;
}

.hero::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 4px;
  background: linear-gradient(90deg, #0078D4, #00B7C3);
}

.hero h1 {
  font-family: 'Plus Jakarta Sans', system-ui, sans-serif;
  font-size: 3.5rem;
  font-weight: 800;
  letter-spacing: -0.025em;
  margin-bottom: 0.5rem;
  background: linear-gradient(135deg, #ffffff 0%, #94a3b8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero .subtitle {
  font-size: 1.25rem;
  color: #94a3b8;
  margin-bottom: 1.5rem;
  font-weight: 400;
}

.hero .generated-note {
  font-size: 0.875rem;
  color: #64748b;
  max-width: 36rem;
  margin: 0 auto;
  line-height: 1.5;
}

.hero .generated-note strong {
  color: #94a3b8;
}

.auth-indicator {
  position: absolute;
  top: 1rem;
  right: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 0.875rem;
  color: #94a3b8;
}

.auth-indicator a {
  color: #94a3b8;
  font-size: 0.8125rem;
  opacity: 0.8;
}

.auth-indicator a:hover {
  opacity: 1;
}

/* ── Config Panel ────────────────────────────────────────── */

.config-panel {
  max-width: 48rem;
  margin: -2rem auto 0;
  padding: 0 1rem;
  position: relative;
  z-index: 1;
}

.config-card {
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 0.75rem;
  padding: 1.5rem 2rem;
  box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
}

.config-card h2 {
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #64748b;
  margin-bottom: 1rem;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  gap: 1rem;
}

.config-item {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.config-label {
  font-size: 0.6875rem;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.config-value {
  font-size: 0.9375rem;
  font-weight: 600;
  color: #1e293b;
}

/* ── Content ─────────────────────────────────────────────── */

.content {
  max-width: 48rem;
  margin: 2.5rem auto 4rem;
  padding: 0 1rem;
}

/* ── Items ────────────────────────────────────────────────── */

.items-section h2 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 1rem;
}

.items-status {
  color: #64748b;
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
  background: #ffffff;
  border: 1px solid #dbeafe;
  border-radius: 0.5rem;
  padding: 1rem 1.25rem;
  transition: border-color 0.15s ease;
}

.item-card:hover {
  border-color: #93c5fd;
}

.item-card h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0.25rem 0;
}

.item-card p {
  font-size: 0.875rem;
  color: #64748b;
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

a {
  color: #0078D4;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

code {
  background: #f1f5f9;
  padding: 0.125rem 0.375rem;
  border-radius: 0.25rem;
  font-size: 0.875rem;
  color: #475569;
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
