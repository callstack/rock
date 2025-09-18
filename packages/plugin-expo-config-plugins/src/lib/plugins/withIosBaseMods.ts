import { BaseMods, type ExportedConfig } from '../ExpoConfigPlugins.js';
import { makeFilePathModifier, makeNullProvider } from '../provider.js';
import type { IosModFileProviders } from '../types.js';

// @todo rewrite template finding and copying logic
const modifyFilePath = makeFilePathModifier('node_modules/../ios');

const nullProvider = makeNullProvider();

// https://github.com/expo/expo/blob/sdk-51/packages/%40expo/config-plugins/src/plugins/withIosBaseMods.ts
const expoProviders = BaseMods.getIosModFileProviders();

export function getIosModFileProviders(
  config: ExportedConfig,
): IosModFileProviders {
  return {
    dangerous: expoProviders.dangerous,
    finalized: expoProviders.finalized,
    appDelegate: modifyFilePath(
      expoProviders.appDelegate,
      `${config._internal?.['iosProjectName']}/AppDelegate.swift`,
    ),
    expoPlist: nullProvider,
    xcodeproj: modifyFilePath(
      expoProviders.xcodeproj,
      `${config._internal?.['iosProjectName']}.xcodeproj/project.pbxproj`,
    ),
    infoPlist: modifyFilePath(
      expoProviders.infoPlist,
      `${config._internal?.['iosProjectName']}/Info.plist`,
    ),
    entitlements: nullProvider,
    podfile: makeNullProvider({
      path: '',
      language: 'rb' as const,
      contents: '',
    }),
    podfileProperties: expoProviders.podfileProperties,
  };
}
