import type { PlatformOutput, PluginApi } from '@rock-js/config';
import { registerBuildCommand } from './commands/build/command.js';
import {
  getValidProjectConfig,
  type HarmonyProjectConfig,
} from './commands/getValidProjectConfig.js';
import { registerRunCommand } from './commands/run/command.js';

type PluginConfig = HarmonyProjectConfig;

export const platformHarmony =
  (pluginConfig?: Partial<PluginConfig>) =>
  (api: PluginApi): PlatformOutput => {
    registerBuildCommand(api, pluginConfig);
    registerRunCommand(api, pluginConfig);

    return {
      name: '@rock-js/platform-harmony',
      description: 'Rock plugin for HarmonyOS Next.',
      autolinkingConfig: {
        get project() {
          const harmonyConfig = getValidProjectConfig(
            api.getProjectRoot(),
            pluginConfig,
          );
          return harmonyConfig;
        },
      },
    };
  };

export default platformHarmony;
