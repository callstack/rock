import { projectConfig } from '@react-native-community/cli-config-android';
import type { AndroidProjectConfig } from '@react-native-community/cli-types';
import { RockError } from '@rock-js/tools';

export function getValidProjectConfig(
  projectRoot: string,
  pluginConfig?: Partial<AndroidProjectConfig>,
) {
  const androidConfig = projectConfig(projectRoot, pluginConfig);
  if (!androidConfig) {
    throw new RockError('Android project not found.');
  }
  return androidConfig;
}
