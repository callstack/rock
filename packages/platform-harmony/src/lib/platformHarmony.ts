import path from 'node:path';
import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import type { PlatformOutput, PluginApi } from '@rock-js/config';
// import { registerBuildCommand } from './commands/buildAndroid/command.js';
// import { registerCreateKeystoreCommand } from './commands/generateKeystore.js';
import { getValidProjectConfig } from './commands/getValidProjectConfig.js';
import { registerRunCommand } from './commands/run/command.js';
// import { registerSignCommand } from './commands/signAndroid/command.js';

type PluginConfig = AndroidProjectConfig;

export const platformHarmony =
  (pluginConfig?: Partial<PluginConfig>) =>
  (api: PluginApi): PlatformOutput => {
    // registerBuildCommand(api, pluginConfig);
    registerRunCommand(api, pluginConfig);
    // registerCreateKeystoreCommand(api, pluginConfig);
    // registerSignCommand(api);

    return {
      name: '@rock-js/platform-harmony',
      description: 'Rock plugin for HarmonyOS Next.',
      autolinkingConfig: {
        get project() {
          const androidConfig = getValidProjectConfig(
            api.getProjectRoot(),
            pluginConfig,
          );
          return {
            ...androidConfig,
            sourceDir: path.join(process.cwd(), '../../SampleApp'),
          };
        },
      },
    };
  };

export default platformHarmony;
