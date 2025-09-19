import type { PluginApi } from '@rock-js/config';
import {
  getValidProjectConfig,
  type HarmonyProjectConfig,
} from '../getValidProjectConfig.js';
import type { BuildFlags } from './buildHarmony.js';
import { buildHarmony, options } from './buildHarmony.js';

export function registerBuildCommand(
  api: PluginApi,
  pluginConfig: Partial<HarmonyProjectConfig> | undefined,
) {
  api.registerCommand({
    name: 'build:harmony',
    description: 'Builds your app for HarmonyOS Next platform.',
    action: async (args) => {
      const projectRoot = api.getProjectRoot();
      const harmonyConfig = getValidProjectConfig(projectRoot, pluginConfig);
      await buildHarmony(
        harmonyConfig,
        args as BuildFlags,
        projectRoot,
        await api.getRemoteCacheProvider(),
        api.getFingerprintOptions(),
      );
    },
    options: options,
  });
}
