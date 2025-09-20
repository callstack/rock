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

  expect(formatConfig([PLATFORMS[0]], plugins, BUNDLERS[1], null))
    .toMatchInlineSnapshot(`
      "import { platformIOS } from '@rock-js/platform-ios';
      import { pluginTest } from '@rock-js/plugin-test';
      import { pluginRepack } from '@rock-js/plugin-repack';

      export default {
        plugins: [
          pluginTest(),
        ],
        bundler: pluginRepack(),
        platforms: {
          ios: platformIOS(),
        },
      };
      "
    `);
});

test(`should format config with the 'github-actions' provider`, () => {
  expect(
    formatConfig([PLATFORMS[0]], null, BUNDLERS[1], {
      name: 'github-actions',
      args: { owner: 'custom-owner', repository: 'repository-name' },
    }),
  ).toMatchInlineSnapshot(`
      "import { platformIOS } from '@rock-js/platform-ios';
      import { pluginRepack } from '@rock-js/plugin-repack';
      import { providerGitHub } from '@rock-js/provider-github';

      export default {
        bundler: pluginRepack(),
        platforms: {
          ios: platformIOS(),
        },
        remoteCacheProvider: providerGitHub({
          owner: 'custom-owner',
          repository: 'repository-name',
        }),
      };
      "
    `);
});

test(`should format config with the 's3' provider`, () => {
  expect(
    formatConfig([PLATFORMS[0]], null, BUNDLERS[1], {
      name: 's3',
      args: { bucket: 'custom-bucket', region: 'us-east-1' },
    }),
  ).toMatchInlineSnapshot(`
      "import { platformIOS } from '@rock-js/platform-ios';
      import { pluginRepack } from '@rock-js/plugin-repack';
      import { providerS3 } from '@rock-js/provider-s3';

      export default {
        bundler: pluginRepack(),
        platforms: {
          ios: platformIOS(),
        },
        remoteCacheProvider: providerS3({
          bucket: 'custom-bucket',
          region: 'us-east-1',
        }),
      };
      "
    `);
});

test(`should format config with the 's3' provider using a custom endpoint`, () => {
  expect(
    formatConfig([PLATFORMS[0]], null, BUNDLERS[1], {
      name: 's3',
      args: {
        bucket: 'custom-bucket',
        region: 'us-east-1',
        endpoint: 'https://custom-endpoint.com',
      },
    }),
  ).toMatchInlineSnapshot(`
      "import { platformIOS } from '@rock-js/platform-ios';
      import { pluginRepack } from '@rock-js/plugin-repack';
      import { providerS3 } from '@rock-js/provider-s3';

      export default {
        bundler: pluginRepack(),
        platforms: {
          ios: platformIOS(),
        },
        remoteCacheProvider: providerS3({
          bucket: 'custom-bucket',
          region: 'us-east-1',
          endpoint: 'https://custom-endpoint.com',
        }),
      };
      "
    `);
});
