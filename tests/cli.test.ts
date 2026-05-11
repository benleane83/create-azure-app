import { describe, expect, it } from 'vitest';
import { getPositionalProjectName, validateProjectName } from '../src/index.js';

describe('CLI helper logic', () => {
  describe('validateProjectName', () => {
    it('accepts valid kebab-case project names', () => {
      for (const value of ['my-app', 'cool-project', 'a', 'my-azure-app-2']) {
        expect(validateProjectName(value)).toBeUndefined();
      }
    });

    it('rejects empty names', () => {
      expect(validateProjectName('')).toBe('Project name is required.');
    });

    it('rejects names with invalid characters or edge hyphens', () => {
      for (const value of ['my app!', 'my@app', 'my/app', 'my\\app', '..', '-my-app', 'my-app-']) {
        expect(validateProjectName(value)).toBe(
          'Project name must be lowercase alphanumeric with optional internal hyphens only.'
        );
      }
    });

    it('rejects names longer than the npm package limit', () => {
      expect(validateProjectName('a'.repeat(215))).toBe('Project name must be 214 characters or fewer.');
    });
  });

  describe('getPositionalProjectName', () => {
    it('returns the first argument that is not an option flag', () => {
      expect(getPositionalProjectName(['--help', 'demo-app', '--version'])).toBe('demo-app');
    });

    it('returns undefined when no positional project name is provided', () => {
      expect(getPositionalProjectName(['--help', '--version'])).toBeUndefined();
    });
  });
});
