import path from 'node:path';
import { BaseMods, type ExportedConfig } from '../ExpoConfigPlugins.js';
import { makeFilePathModifier } from '../provider.js';

const modifyFilePath = makeFilePathModifier(
  path.join('node_modules', '..', 'android'),
);

// https://github.com/expo/expo/blob/sdk-51/packages/%40expo/config-plugins/src/plugins/withAndroidBaseMods.ts
const expoProviders = BaseMods.getAndroidModFileProviders();

export function getAndroidModFileProviders(config: ExportedConfig) {
  const packageParts =
    config._internal?.['androidPackageName']?.split('.') ?? [];

  return {
    dangerous: expoProviders.dangerous,
    finalized: expoProviders.finalized,
    manifest: modifyFilePath(
      expoProviders.manifest,
      path.join('app', 'src', 'main', 'AndroidManifest.xml'),
    ),
    gradleProperties: expoProviders.gradleProperties,
    strings: modifyFilePath(
      expoProviders.strings,
      path.join('app', 'src', 'main', 'res', 'values', 'strings.xml'),
    ),
    colors: modifyFilePath(
      expoProviders.colors,
      path.join('app', 'src', 'main', 'res', 'values', 'colors.xml'),
    ),
    colorsNight: modifyFilePath(
      expoProviders.colors,
      path.join('app', 'src', 'main', 'res', 'values-night', 'colors.xml'),
    ),
    styles: modifyFilePath(
      expoProviders.styles,
      path.join('app', 'src', 'main', 'res', 'values', 'styles.xml'),
    ),
    projectBuildGradle: expoProviders.projectBuildGradle,
    settingsGradle: expoProviders.settingsGradle,
    appBuildGradle: modifyFilePath(
      expoProviders.appBuildGradle,
      path.join('app', 'build.gradle'),
    ),
    mainActivity: modifyFilePath(
      expoProviders.mainActivity,
      path.join(
        'app',
        'src',
        'main',
        'java',
        ...packageParts,
        'MainActivity.kt',
      ),
    ),
    mainApplication: modifyFilePath(
      expoProviders.mainApplication,
      path.join(
        'app',
        'src',
        'main',
        'java',
        ...packageParts,
        'MainApplication.kt',
      ),
    ),
  };
}
