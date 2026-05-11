import { describe, expect, it } from 'vitest';
import { cicdFeature } from '../src/features/cicd.js';

function getFileContent(files: Array<{ path: string; content: string }>, path: string): string {
  const file = files.find((entry) => entry.path === path);
  expect(file, `expected generated file ${path}`).toBeDefined();
  return file!.content;
}

describe('deploy workflow generation', () => {
  it('resolves the Static Web App by tag and fails if the match is not unique', () => {
    const feature = cicdFeature({
      projectName: 'demo-app',
      framework: 'nextjs',
      packageManager: 'npm',
      includeDatabase: true,
      orm: 'prisma',
    });

    const workflow = getFileContent(feature.files, '.github/workflows/deploy.yml');

    expect(workflow).toContain('az resource list --resource-group "$RESOURCE_GROUP" --resource-type "Microsoft.Web/staticSites" --tag "azd-service-name=web"');
    expect(workflow).toContain('Expected exactly one Static Web App tagged azd-service-name=web');
    expect(workflow).not.toContain('az staticwebapp list --resource-group');
    expect(workflow).not.toContain('--query "[0].name" -o tsv)');
  });
});