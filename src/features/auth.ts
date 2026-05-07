import type { Feature } from '../composer.js';

export function authFeature(config: {
  framework: 'nextjs' | 'vite-react' | 'sveltekit';
}): Feature {
  const configContent = swaConfigContent();
  const staticDir =
    config.framework === 'sveltekit' ? 'src/web/static' : 'src/web/public';

  const files = [
    { path: 'staticwebapp.config.json', content: configContent },
    { path: `${staticDir}/staticwebapp.config.json`, content: configContent },
    apiAuthHelper(),
    ...frameworkAuthFiles(config.framework),
  ];

  return {
    name: 'auth',
    files,
    dependencies: {},
    devDependencies: {},
    scripts: {},
  };
}

// ─── SWA Configuration ──────────────────────────────────────────────────────

function swaConfigContent(): string {
  return JSON.stringify(
    {
      routes: [
        {
          route: '/login',
          redirect: '/.auth/login/aad',
        },
        {
          route: '/logout',
          redirect: '/.auth/logout',
        },
        {
          route: '/api/*',
          allowedRoles: ['authenticated'],
        },
        // catch-all MUST be last — SWA evaluates routes top-to-bottom
        {
          route: '/*',
          allowedRoles: ['authenticated'],
        },
      ],
      responseOverrides: {
        '401': {
          redirect: '/.auth/login/aad',
          statusCode: 302,
        },
      },
      navigationFallback: {
        rewrite: '/index.html',
        exclude: ['/images/*.{png,jpg,gif}', '/css/*', '/api/*'],
      },
      platform: {
        apiRuntime: 'node:20',
      },
    },
    null,
    2
  ) + '\n';
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
  framework: 'nextjs' | 'vite-react' | 'sveltekit'
) {
  switch (framework) {
    case 'nextjs':
      return nextjsAuth();
    case 'vite-react':
      return viteReactAuth();
    case 'sveltekit':
      return sveltekitAuth();
  }
}

// ─── Next.js ─────────────────────────────────────────────────────────────────

function nextjsAuth() {
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
  ];
}

// ─── Vite + React ────────────────────────────────────────────────────────────

function viteReactAuth() {
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
  ];
}

// ─── SvelteKit ───────────────────────────────────────────────────────────────

function sveltekitAuth() {
  return [
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
  ];
}
