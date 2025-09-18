import type {
  BaseModProviderMethods,
  BaseMods,
  ForwardedBaseModOptions,
  ModPlatform,
} from './ExpoConfigPlugins.js';

export type CustomModProvider = <
  ModType,
  Props extends ForwardedBaseModOptions,
>(
  original: BaseModProviderMethods<ModType, Props>,
  file: string,
) => BaseModProviderMethods<ModType, Props>;

export type IosModFileProviders = ReturnType<
  typeof BaseMods.getIosModFileProviders
> &
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, BaseModProviderMethods<any, any>>;

export type AndroidModFileProviders = ReturnType<
  typeof BaseMods.getAndroidModFileProviders
> &
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Record<string, BaseModProviderMethods<any, any>>;

export type JSONValue =
  | boolean
  | number
  | string
  | null
  | JSONArray
  | JSONObject;

export type JSONArray = Array<JSONValue>;
export interface JSONObject {
  [key: string]: JSONValue | undefined;
}

export type ProjectInfo = {
  introspect: boolean;
  projectRoot: string;
  platforms: ModPlatform[];
  packageJsonPath: string;
  appJsonPath: string;
  iosProjectName: string;
  iosBundleIdentifier: string;
  androidPackageName: string;
};
