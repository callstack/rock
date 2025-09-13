import { formatConfig } from '../bin.js';
import type { TemplateInfo } from '../templates.js';
import { BUNDLERS, PLATFORMS } from '../templates.js';

test('should format config without plugins', () => {
  expect(formatConfig(PLATFORMS, null, BUNDLERS[0], null))
    .toMatchInlineSnapshot(`
      "import { platformIOS } from '@rock-js/platform-ios';
      import { platformAndroid } from '@rock-js/platform-android';
      import { pluginMetro } from '@rock-js/plugin-metro';

      export default {
        bundler: pluginMetro(),
        platforms: {
          ios: platformIOS(),
          android: platformAndroid(),
        },
      };
      "
    `);
});

test('should format config with plugins', () => {
  const plugins: TemplateInfo[] = [
    {
      type: 'npm',
      name: 'test',
      packageName: '@rock-js/plugin-test',
      version: 'latest',
      directory: 'template',
      importName: 'pluginTest',
    },
  ];

  expect(
    formatConfig([PLATFORMS[0]], plugins, BUNDLERS[1], {
      name: 'github-actions',
      args: { owner: 'custom-owner', repo: 'repo-name', token: 'GITHUB_TOKEN' },
    }),
  ).toMatchInlineSnapshot(`
      "import { platformIOS } from '@rock-js/platform-ios';
      import { pluginTest } from '@rock-js/plugin-test';
      import { pluginRepack } from '@rock-js/plugin-repack';
      import { providerGithubActions } from '@rock-js/provider-github-actions';

      export default {
        plugins: [
          pluginTest(),
        ],
        bundler: pluginRepack(),
        platforms: {
          ios: platformIOS(),
        },
        remoteCacheProvider: providerGithubActions({
          owner: "custom-owner",
          repo: "repo-name",
          token: process.env['GITHUB_TOKEN'],
        }),
      };
      "
    `);
});
