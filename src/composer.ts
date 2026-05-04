import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

export interface FileEntry {
  path: string;   // relative to generated project root
  content: string;
}

export interface Feature {
  name: string;
  files: FileEntry[];
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  scripts?: Record<string, string>;
}

export interface ComposedProject {
  files: FileEntry[];
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
  scripts: Record<string, string>;
}

/**
 * Merge multiple features into a unified project structure.
 * Later features override earlier ones for same-path files.
 * Dependencies, devDependencies, and scripts are merged (later wins on conflict).
 */
export function compose(features: Feature[]): ComposedProject {
  const fileMap = new Map<string, string>();
  const dependencies: Record<string, string> = {};
  const devDependencies: Record<string, string> = {};
  const scripts: Record<string, string> = {};

  for (const feature of features) {
    for (const file of feature.files) {
      fileMap.set(file.path, file.content);
    }
    Object.assign(dependencies, feature.dependencies);
    Object.assign(devDependencies, feature.devDependencies);
    Object.assign(scripts, feature.scripts);
  }

  const files: FileEntry[] = Array.from(fileMap.entries()).map(([path, content]) => ({
    path,
    content,
  }));

  return { files, dependencies, devDependencies, scripts };
}

/**
 * Write all composed files to the target project directory.
 * Creates intermediate directories as needed.
 */
export async function writeProject(projectDir: string, files: FileEntry[]): Promise<void> {
  for (const file of files) {
    const fullPath = join(projectDir, file.path);
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, 'utf-8');
  }
}
