import type { Feature } from '../composer.js';
import type { ProjectConfig } from '../index.js';
import { pmRun } from '../utils.js';

export function authFeature(config: {
  framework: 'nextjs' | 'vite-react' | 'sveltekit';
} & Pick<ProjectConfig, 'projectName' | 'orm' | 'includeAuth' | 'includeTailwind' | 'packageManager'>): Feature {
  const files = [
    apiAuthHelper(),
    ...frameworkAuthFiles(config),
  ];

  return {
    name: 'auth',
    files,
    dependencies: {},
    devDependencies: {},
    scripts: {},
  };
}

// ─── API Auth Helper ─────────────────────────────────────────────────────────

function apiAuthHelper() {
  return {
    path: 'src/api/src/lib/auth.ts',
    content: `import { HttpRequest } from '@azure/functions';

/**
 * Parsed SWA Easy Auth client principal.
 * SWA injects the \`x-ms-client-principal\` header on every authenticated request.
 * The value is a Base64-encoded JSON payload.
 */
export interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
  claims: Array<{ typ: string; val: string }>;
}

export interface AuthUser {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

/**
 * Parse the SWA client principal header and return typed user info.
 * Returns \`null\` when the request is unauthenticated.
 */
export function getUser(request: HttpRequest): AuthUser | null {
  const header = request.headers.get('x-ms-client-principal');
  if (!header) {
    return null;
  }

  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    const principal: ClientPrincipal = JSON.parse(decoded);

    return {
      identityProvider: principal.identityProvider,
      userId: principal.userId,
      userDetails: principal.userDetails,
      userRoles: principal.userRoles ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Require authentication — throws a Response with 401 if not authenticated.
 * Use at the top of any Azure Function handler that needs auth.
 */
export function requireAuth(request: HttpRequest): AuthUser {
  const user = getUser(request);
  if (!user) {
    throw { status: 401, body: 'Unauthorized: no valid client principal' };
  }
  return user;
}
`,
  };
}

// ─── Framework-Specific Auth Files ───────────────────────────────────────────

function frameworkAuthFiles(
  config: {
    framework: 'nextjs' | 'vite-react' | 'sveltekit';
  } & Pick<ProjectConfig, 'projectName' | 'orm' | 'includeAuth' | 'includeTailwind' | 'packageManager'>
) {
  switch (config.framework) {
    case 'nextjs':
      return nextjsAuth(config);
    case 'vite-react':
      return viteReactAuth(config);
    case 'sveltekit':
      return sveltekitAuth(config);
  }
}

// ─── Next.js ─────────────────────────────────────────────────────────────────

function nextjsAuth(config: Pick<ProjectConfig, 'projectName' | 'orm' | 'includeAuth' | 'includeTailwind' | 'packageManager'> & { framework: string }) {
  const { projectName } = config;
  return [
    {
      path: 'src/web/lib/auth.ts',
      content: `'use client';

import { useEffect, useState } from 'react';

interface AuthUser {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

interface SWAAuthResponse {
  clientPrincipal: {
    identityProvider: string;
    userId: string;
    userDetails: string;
    userRoles: string[];
  } | null;
}

/**
 * React hook for SWA Easy Auth.
 * Calls the \`/.auth/me\` endpoint to retrieve the current user session.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchUser(): Promise<void> {
      try {
        const res = await fetch('/.auth/me');
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data: SWAAuthResponse = await res.json();
        if (!cancelled && data.clientPrincipal) {
          setUser({
            identityProvider: data.clientPrincipal.identityProvider,
            userId: data.clientPrincipal.userId,
            userDetails: data.clientPrincipal.userDetails,
            userRoles: data.clientPrincipal.userRoles ?? [],
          });
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchUser();
    return () => { cancelled = true; };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login: () => { window.location.href = '/.auth/login/aad'; },
    logout: () => { window.location.href = '/.auth/logout'; },
  };
}
`,
    },
    {
      path: 'src/web/app/page.tsx',
      content: `'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';

interface Item {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
}

export default function Home() {
  const { user, isAuthenticated, logout } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/items')
      .then((res) => {
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        return res.json();
      })
      .then((data) => setItems(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="hero">
        {isAuthenticated && user && (
          <div className="auth-indicator">
            <span>{user.userDetails}</span>
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Sign out</a>
          </div>
        )}
        <h1>${projectName}</h1>
        <p className="subtitle">Your Azure full-stack app is ready.</p>
        <p className="generated-note">
          Generated by <strong>create-azure-app</strong> — a full-stack template
          preconfigured for Azure deployment with Static Web Apps + Functions + PostgreSQL.
        </p>
      </header>

      <div className="config-panel">
        <div className="config-card">
          <h2>Project Configuration</h2>
          <div className="config-grid">
            <div className="config-item">
              <span className="config-label">Framework</span>
              <span className="config-value">${config.framework === 'nextjs' ? 'Next.js' : config.framework === 'vite-react' ? 'Vite + React' : 'SvelteKit'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">ORM</span>
              <span className="config-value">${config.orm === 'prisma' ? 'Prisma' : 'Drizzle'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Auth</span>
              <span className="config-value">${config.includeAuth ? 'Yes' : 'No'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Tailwind</span>
              <span className="config-value">${config.includeTailwind ? 'Yes' : 'No'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Package Manager</span>
              <span className="config-value">${config.packageManager}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <section className="items-section">
          <h2>Using This Template</h2>
          <p className="items-note">Data in this list is loaded dynamically from your API</p>
          {loading && <p className="items-status">Loading items...</p>}
          {error && (
            <p className="items-status items-error">Could not load items: {error}</p>
          )}
          {!loading && !error && items.length === 0 && (
            <p className="items-status">
              No items yet. Run <code>${pmRun(config.packageManager, 'db:seed')}</code> to add sample data.
            </p>
          )}
          {items.length > 0 && (
            <ul className="items-grid">
              {items.map((item) => (
                <li key={item.id} className="item-card">
                  <span
                    className={\`badge \${
                      item.completed ? 'badge-done' : 'badge-todo'
                    }\`}
                  >
                    {item.completed ? 'Done' : 'Todo'}
                  </span>
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
`,
    },
  ];
}

// ─── Vite + React ────────────────────────────────────────────────────────────

function viteReactAuth(config: Pick<ProjectConfig, 'projectName' | 'orm' | 'includeAuth' | 'includeTailwind' | 'packageManager'> & { framework: string }) {
  const { projectName } = config;
  return [
    {
      path: 'src/web/src/hooks/useAuth.ts',
      content: `import { useEffect, useState } from 'react';

interface AuthUser {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
}

interface SWAAuthResponse {
  clientPrincipal: {
    identityProvider: string;
    userId: string;
    userDetails: string;
    userRoles: string[];
  } | null;
}

/**
 * React hook for SWA Easy Auth.
 * Calls the \`/.auth/me\` endpoint to retrieve the current user session.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchUser(): Promise<void> {
      try {
        const res = await fetch('/.auth/me');
        if (!res.ok) {
          setUser(null);
          return;
        }
        const data: SWAAuthResponse = await res.json();
        if (!cancelled && data.clientPrincipal) {
          setUser({
            identityProvider: data.clientPrincipal.identityProvider,
            userId: data.clientPrincipal.userId,
            userDetails: data.clientPrincipal.userDetails,
            userRoles: data.clientPrincipal.userRoles ?? [],
          });
        }
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchUser();
    return () => { cancelled = true; };
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated: user !== null,
    login: () => { window.location.href = '/.auth/login/aad'; },
    logout: () => { window.location.href = '/.auth/logout'; },
  };
}
`,
    },
    {
      path: 'src/web/src/App.tsx',
      content: `import { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';

interface Item {
  id: number;
  title: string;
  description: string | null;
  completed: boolean;
}

export function App() {
  const { user, isAuthenticated, logout } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/items')
      .then((res) => {
        if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
        return res.json();
      })
      .then((data) => setItems(data))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <header className="hero">
        {isAuthenticated && user && (
          <div className="auth-indicator">
            <span>{user.userDetails}</span>
            <a href="#" onClick={(e) => { e.preventDefault(); logout(); }}>Sign out</a>
          </div>
        )}
        <h1>${projectName}</h1>
        <p className="subtitle">Your Azure full-stack app is ready.</p>
        <p className="generated-note">
          Generated by <strong>create-azure-app</strong> — a full-stack template
          preconfigured for Azure deployment with Static Web Apps + Functions + PostgreSQL.
        </p>
      </header>

      <div className="config-panel">
        <div className="config-card">
          <h2>Project Configuration</h2>
          <div className="config-grid">
            <div className="config-item">
              <span className="config-label">Framework</span>
              <span className="config-value">${config.framework === 'nextjs' ? 'Next.js' : config.framework === 'vite-react' ? 'Vite + React' : 'SvelteKit'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">ORM</span>
              <span className="config-value">${config.orm === 'prisma' ? 'Prisma' : 'Drizzle'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Auth</span>
              <span className="config-value">${config.includeAuth ? 'Yes' : 'No'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Tailwind</span>
              <span className="config-value">${config.includeTailwind ? 'Yes' : 'No'}</span>
            </div>
            <div className="config-item">
              <span className="config-label">Package Manager</span>
              <span className="config-value">${config.packageManager}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="content">
        <section className="items-section">
          <h2>Using This Template</h2>
          <p className="items-note">Data in this list is loaded dynamically from your API</p>
          {loading && <p className="items-status">Loading items...</p>}
          {error && (
            <p className="items-status items-error">Could not load items: {error}</p>
          )}
          {!loading && !error && items.length === 0 && (
            <p className="items-status">
              No items yet. Run <code>${pmRun(config.packageManager, 'db:seed')}</code> to add sample data.
            </p>
          )}
          {items.length > 0 && (
            <ul className="items-grid">
              {items.map((item) => (
                <li key={item.id} className="item-card">
                  <span
                    className={\`badge \${
                      item.completed ? 'badge-done' : 'badge-todo'
                    }\`}
                  >
                    {item.completed ? 'Done' : 'Todo'}
                  </span>
                  <h3>{item.title}</h3>
                  {item.description && <p>{item.description}</p>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
`,
    },
  ];
}

// ─── SvelteKit ───────────────────────────────────────────────────────────────

function sveltekitAuth(config: Pick<ProjectConfig, 'projectName' | 'orm' | 'includeAuth' | 'includeTailwind' | 'packageManager'> & { framework: string }) {
  const { projectName } = config;
  return [
    {
      path: 'src/web/src/app.d.ts',
      content: `// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { AuthUser } from '$lib/auth';

declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: AuthUser | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
`,
    },
    {
      path: 'src/web/src/lib/auth.ts',
      content: `/**
 * SvelteKit auth helper for SWA Easy Auth.
 * Use in server-side load functions and API routes.
 */

export interface AuthUser {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

interface ClientPrincipal {
  identityProvider: string;
  userId: string;
  userDetails: string;
  userRoles: string[];
}

/**
 * Parse the SWA client principal from a request's headers.
 */
export function getUserFromHeaders(headers: Headers): AuthUser | null {
  const header = headers.get('x-ms-client-principal');
  if (!header) return null;

  try {
    const decoded = Buffer.from(header, 'base64').toString('utf-8');
    const principal: ClientPrincipal = JSON.parse(decoded);
    return {
      identityProvider: principal.identityProvider,
      userId: principal.userId,
      userDetails: principal.userDetails,
      userRoles: principal.userRoles ?? [],
    };
  } catch {
    return null;
  }
}

/**
 * Fetch current user from the \`/.auth/me\` endpoint (client-side).
 */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    const res = await fetch('/.auth/me');
    if (!res.ok) return null;
    const data = await res.json();
    return data.clientPrincipal ?? null;
  } catch {
    return null;
  }
}

export const loginUrl = '/.auth/login/aad';
export const logoutUrl = '/.auth/logout';
`,
    },
    {
      path: 'src/web/src/hooks.server.ts',
      content: `import type { Handle } from '@sveltejs/kit';
import { getUserFromHeaders } from '$lib/auth';

/**
 * SvelteKit server hook — parses SWA auth on every request
 * and makes the user available via \`event.locals.user\`.
 */
export const handle: Handle = async ({ event, resolve }) => {
  const user = getUserFromHeaders(event.request.headers);
  event.locals.user = user;
  return resolve(event);
};
`,
    },
    {
      path: 'src/web/src/routes/+page.svelte',
      content: `<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCurrentUser, logoutUrl, type AuthUser } from '$lib/auth';

  interface Item {
    id: number;
    title: string;
    description: string | null;
    completed: boolean;
  }

  let user = $state<AuthUser | null>(null);
  let items = $state<Item[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    user = await fetchCurrentUser();

    try {
      const res = await fetch('/api/items');
      if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
      items = await res.json();
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      loading = false;
    }
  });
</script>

<header class="hero">
  {#if user}
    <div class="auth-indicator">
      <span>{user.userDetails}</span>
      <a href={logoutUrl}>Sign out</a>
    </div>
  {/if}
  <h1>${projectName}</h1>
  <p class="subtitle">Your Azure full-stack app is ready.</p>
  <p class="generated-note">
    Generated by <strong>create-azure-app</strong> — a full-stack template
    preconfigured for Azure deployment with Static Web Apps + Functions + PostgreSQL.
  </p>
</header>

<div class="config-panel">
  <div class="config-card">
    <h2>Project Configuration</h2>
    <div class="config-grid">
      <div class="config-item">
        <span class="config-label">Framework</span>
        <span class="config-value">${config.framework === 'nextjs' ? 'Next.js' : config.framework === 'vite-react' ? 'Vite + React' : 'SvelteKit'}</span>
      </div>
      <div class="config-item">
        <span class="config-label">ORM</span>
        <span class="config-value">${config.orm === 'prisma' ? 'Prisma' : 'Drizzle'}</span>
      </div>
      <div class="config-item">
        <span class="config-label">Auth</span>
        <span class="config-value">${config.includeAuth ? 'Yes' : 'No'}</span>
      </div>
      <div class="config-item">
        <span class="config-label">Tailwind</span>
        <span class="config-value">${config.includeTailwind ? 'Yes' : 'No'}</span>
      </div>
      <div class="config-item">
        <span class="config-label">Package Manager</span>
        <span class="config-value">${config.packageManager}</span>
      </div>
    </div>
  </div>
</div>

<div class="content">
  <section class="items-section">
    <h2>Using This Template</h2>
    <p class="items-note">Data in this list is loaded dynamically from your API</p>
    {#if loading}
      <p class="items-status">Loading items...</p>
    {:else if error}
      <p class="items-status items-error">Could not load items: {error}</p>
    {:else if items.length === 0}
      <p class="items-status">
        No items yet. Run <code>${pmRun(config.packageManager, 'db:seed')}</code> to add sample data.
      </p>
    {:else}
      <ul class="items-grid">
        {#each items as item (item.id)}
          <li class="item-card">
            <span class="badge {item.completed ? 'badge-done' : 'badge-todo'}">
              {item.completed ? 'Done' : 'Todo'}
            </span>
            <h3>{item.title}</h3>
            {#if item.description}
              <p>{item.description}</p>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  </section>
</div>

<style>
  :global(body) {
    margin: 0;
    font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f8fafc;
    color: #1e293b;
    min-height: 100vh;
  }

  .hero {
    position: relative;
    background: #0f1729;
    color: #e2e8f0;
    padding: 4rem 2rem 3.5rem;
    text-align: center;
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
    font-size: 2.5rem;
    font-weight: 800;
    letter-spacing: -0.025em;
    margin: 0 0 0.75rem;
    background: linear-gradient(135deg, #60a5fa, #38bdf8);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .subtitle {
    font-size: 1.15rem;
    color: #94a3b8;
    margin: 0 0 1rem;
    font-weight: 400;
  }

  .generated-note {
    font-size: 0.85rem;
    color: #64748b;
    max-width: 560px;
    margin: 0 auto;
    line-height: 1.5;
  }

  :global(strong) {
    color: #38bdf8;
  }

  .config-panel {
    max-width: 720px;
    margin: -2rem auto 2rem;
    padding: 0 1.5rem;
    position: relative;
    z-index: 1;
  }

  .config-card {
    background: #ffffff;
    border: 1px solid #dbeafe;
    border-radius: 12px;
    padding: 1.5rem 2rem;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  }

  .config-card h2 {
    font-size: 0.8rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #64748b;
    margin: 0 0 1rem;
    font-weight: 600;
  }

  .config-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 1rem;
  }

  .config-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .config-label {
    font-size: 0.75rem;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }

  .config-value {
    font-size: 0.95rem;
    font-weight: 600;
    color: #1e293b;
  }

  .content {
    max-width: 720px;
    margin: 0 auto;
    padding: 0 1.5rem 3rem;
  }

  .items-section h2 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 1rem;
    color: #1e293b;
  }

  .items-status {
    color: #64748b;
    font-size: 0.95rem;
  }

  .items-error {
    color: #dc2626;
  }

  code {
    background: #f1f5f9;
    padding: 0.15em 0.4em;
    border-radius: 4px;
    font-size: 0.85em;
    color: #0f172a;
  }

  .items-grid {
    list-style: none;
    padding: 0;
    margin: 0;
    display: grid;
    gap: 0.75rem;
  }

  .item-card {
    background: #ffffff;
    border: 1px solid #dbeafe;
    border-radius: 8px;
    padding: 1rem 1.25rem;
    transition: box-shadow 0.15s ease, border-color 0.15s ease;
  }

  .item-card:hover {
    border-color: #93c5fd;
    box-shadow: 0 2px 12px rgba(0, 120, 212, 0.08);
  }

  .badge {
    display: inline-block;
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    padding: 0.2em 0.6em;
    border-radius: 4px;
    margin-bottom: 0.5rem;
  }

  .badge-done {
    background: #dcfce7;
    color: #166534;
  }

  .badge-todo {
    background: #fef9c3;
    color: #854d0e;
  }

  .item-card h3 {
    font-size: 1rem;
    font-weight: 600;
    margin: 0 0 0.25rem;
    color: #1e293b;
  }

  .item-card p {
    font-size: 0.875rem;
    color: #64748b;
    margin: 0;
    line-height: 1.4;
  }

  :global(.auth-indicator) {
    position: absolute;
    top: 1rem;
    right: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    font-size: 0.8rem;
    color: #94a3b8;
  }

  :global(.auth-indicator a) {
    color: #60a5fa;
    text-decoration: none;
    font-weight: 500;
  }

  :global(.auth-indicator a:hover) {
    text-decoration: underline;
  }
</style>
`,
    },
  ];
}
