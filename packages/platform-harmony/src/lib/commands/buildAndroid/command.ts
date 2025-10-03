import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import type { PluginApi } from '@rock-js/config';
import { getValidProjectConfig } from '../getValidProjectConfig.js';
import type { BuildFlags } from './buildAndroid.js';
import { buildAndroid, options } from './buildAndroid.js';

export function registerBuildCommand(
  api: PluginApi,
  pluginConfig: Partial<AndroidProjectConfig> | undefined,
) {
  api.registerCommand({
    name: 'build:android',
    description: 'Builds your app for Android platform.',
    action: async (args) => {
      const androidConfig = getValidProjectConfig(
        api.getProjectRoot(),
        pluginConfig,
      );
      await buildAndroid(
        androidConfig,
        args as BuildFlags,
        api.getProjectRoot(),
        await api.getRemoteCacheProvider(),
        api.getFingerprintOptions(),
      );
    },
    options: options,
  });
}
