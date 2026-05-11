import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { writeProject } from '../src/composer.js';

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dir) => rm(dir, { recursive: true, force: true })));
});

describe('writeProject', () => {
  it('deletes stale files before rewriting when destructive overwrite is enabled', async () => {
    const projectDir = await mkdtemp(join(tmpdir(), 'create-azure-app-overwrite-'));
    tempDirs.push(projectDir);

    await writeFile(join(projectDir, 'obsolete.txt'), 'stale file', 'utf-8');
    await writeFile(join(projectDir, 'package.json'), '{"name":"old"}', 'utf-8');

    await writeProject(
      projectDir,
      [
        { path: 'package.json', content: '{"name":"new"}\n' },
        { path: 'src/index.ts', content: 'export const ok = true;\n' },
      ],
      { destructiveOverwrite: true }
    );

    await expect(readFile(join(projectDir, 'package.json'), 'utf-8')).resolves.toBe('{"name":"new"}\n');
    await expect(readFile(join(projectDir, 'src/index.ts'), 'utf-8')).resolves.toBe('export const ok = true;\n');
    await expect(readFile(join(projectDir, 'obsolete.txt'), 'utf-8')).rejects.toThrow();
  });
});