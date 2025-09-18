// '@expo/config-plugins' is a CommonJS module, which may not support all
// module.exports as named exports. CommonJS modules can always be imported via
// the default export.
import type {
  ConfigPlugin,
  ExportedConfig,
  ModPlatform,
} from '@expo/config-plugins';
import ExpoConfigPlugins from '@expo/config-plugins';
import type {
  BaseModProviderMethods,
  ForwardedBaseModOptions,
} from '@expo/config-plugins/build/plugins/createBaseMod';

const {
  BaseMods,
  evalModsAsync,
  withPlugins,
  AndroidConfig,
  IOSConfig,
  withDefaultBaseMods,
  compileModsAsync,
} = ExpoConfigPlugins;

export {
  type ModPlatform,
  type BaseModProviderMethods,
  type ForwardedBaseModOptions,
  type ConfigPlugin,
  type ExportedConfig,
  BaseMods,
  evalModsAsync,
  withPlugins,
  AndroidConfig,
  IOSConfig,
  withDefaultBaseMods,
  compileModsAsync,
};
