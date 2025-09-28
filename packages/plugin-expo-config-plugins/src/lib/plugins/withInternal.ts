import type { ConfigPlugin } from '../ExpoConfigPlugins.js';
import type { ProjectInfo } from '../types.js';
type Internals = Omit<ProjectInfo, 'appJsonPath'>;

export const withInternal: ConfigPlugin<Internals> = (config, internals) => {
  config._internal = {
    isDebug: false,
    ...config._internal,
    ...internals,
  };
  return config;
};
