import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import type { PluginApi } from '@rock-js/config';
import { getValidProjectConfig } from '../getValidProjectConfig.js';
import type { Flags } from './runHarmony.js';
import { runHarmony, runOptions } from './runHarmony.js';

export function registerRunCommand(
  api: PluginApi,
  pluginConfig: Partial<AndroidProjectConfig> | undefined,
) {
  api.registerCommand({
    name: 'run:harmony',
    description:
      'Builds your app and starts it on a connected HarmonyOS Next emulator or a device.',
    action: async (args) => {
      const projectRoot = api.getProjectRoot();
      const androidConfig = getValidProjectConfig(projectRoot, pluginConfig);
      await runHarmony(
        androidConfig,
        args as Flags,
        projectRoot,
        await api.getRemoteCacheProvider(),
        api.getFingerprintOptions(),
      );
    },
    options: runOptions,
  });
}
