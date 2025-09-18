import * as fs from 'node:fs/promises';
import path from 'node:path';
import { cleanup, getTempDirectory } from '@rock-js/test-helpers';
import * as plist from 'plist';
import { afterEach, beforeEach, expect, test } from 'vitest';
import {
  AndroidConfig,
  evalModsAsync,
  IOSConfig,
  withDefaultBaseMods,
  withPlugins,
} from '../lib/ExpoConfigPlugins.js';
import { pluginExpoConfigPlugins } from '../lib/pluginExpoConfigPlugins.js';
import { withAndroidExpoPlugins } from '../lib/plugins/modCompiler.js';
import { withInternal } from '../lib/plugins/withInternal.js';
import type { ProjectInfo } from '../lib/types.js';

let TEMP_DIR: string;

const pluginApi = {
  registerCommand: vi.fn(),
  getProjectRoot: vi.fn(),
  getReactNativePath: vi.fn(),
  getReactNativeVersion: vi.fn(),
  getPlatforms: vi.fn(),
  getRemoteCacheProvider: vi.fn(),
  getFingerprintOptions: vi.fn(),
};

beforeEach(async () => {
  TEMP_DIR = getTempDirectory('expo-config-plugins-test-app');

  const testAppPath = path.join(
    __dirname,
    '..',
    '..',
    '..',
    '..',
    'apps',
    'expo-config-plugins-test-app',
  );
  await fs.cp(testAppPath, TEMP_DIR, { recursive: true });

  pluginApi.getProjectRoot.mockReturnValue(TEMP_DIR);
});

afterEach(() => {
  if (TEMP_DIR) {
    cleanup(TEMP_DIR);
  }
});

async function getTestConfig() {
  const appJsonPath = path.join(pluginApi.getProjectRoot(), 'app.json');
  const iosDirPath = path.join(pluginApi.getProjectRoot(), 'ios');
  const androidDirPath = path.join(pluginApi.getProjectRoot(), 'android');

  const [appJsonContent, iosDirContent, androidDirContent] = await Promise.all([
    fs.readFile(appJsonPath, 'utf-8'),
    fs.readdir(iosDirPath),
    fs.readdir(androidDirPath),
  ]);

  const { expo, ...rest } = JSON.parse(appJsonContent);
  const appJsonConfig = expo || rest;

  const iosProjectName =
    iosDirContent.find((dir) => dir.includes('.xcodeproj'))?.split('.')[0] ??
    '';

  const androidProjectName = androidDirContent.find((dir) =>
    dir.includes('.gradle'),
  )
    ? 'android'
    : '';

  const info = {
    projectRoot: pluginApi.getProjectRoot(),
    platforms: ['ios', 'android'] as ProjectInfo['platforms'],
    packageJsonPath: path.join(pluginApi.getProjectRoot(), 'package.json'),
    appJsonPath,
    iosProjectName,
    androidProjectName,
  };

  return { appJsonConfig, info };
}

async function parsePlistForKey(path: string, key: string) {
  const infoPlistContent = await fs.readFile(path, 'utf8');
  const parsed = plist.parse(infoPlistContent) as Record<
    string,
    plist.PlistValue
  >;

  return parsed[key];
}

test('plugin is called with correct arguments and returns its name and description', () => {
  const plugin = pluginExpoConfigPlugins()(pluginApi);

  expect(plugin).toMatchObject({
    name: 'plugin-expo-config-plugins',
    description: 'Rock plugin for Expo Config Plugins.',
  });
});

describe('plugin applies default iOS config plugins correctly', () => {
  test('withBundleIdentifier', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    if (!config.ios) config.ios = {};
    config.ios.bundleIdentifier = 'dev.rockjs.test';

    config = withPlugins(config, [
      [
        IOSConfig.BundleIdentifier.withBundleIdentifier,
        { bundleIdentifier: config.ios?.bundleIdentifier },
      ],
    ]);

    config = withDefaultBaseMods(config);

    const projectPbxprojPath = path.join(
      TEMP_DIR,
      'ios',
      `${info.iosProjectName}.xcodeproj`,
      'project.pbxproj',
    );

    // Check the initial bundle identifier
    const projectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(projectContent).toContain(
      'PRODUCT_BUNDLE_IDENTIFIER = "org.reactjs.native.example',
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check the changed bundle identifier
    const changedProjectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(changedProjectContent).toContain(
      `PRODUCT_BUNDLE_IDENTIFIER = "${config.ios?.bundleIdentifier}";`,
    );
  });

  test.skip('withGoogle', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    config = withPlugins(config, [IOSConfig.Google.withGoogle]);

    config = withDefaultBaseMods(config);

    // Check something

    // Apply the plugin
    await evalModsAsync(config, info);
  });

  test('withDisplayName', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Edit the display name
    config.name = 'TestAppEditedName';

    config = withPlugins(config, [IOSConfig.Name.withDisplayName]);
    config = withDefaultBaseMods(config);

    const infoPlistPath = path.join(
      TEMP_DIR,
      'ios',
      info.iosProjectName,
      'Info.plist',
    );

    // Check initial state
    const initialDisplayName = await parsePlistForKey(
      infoPlistPath,
      'CFBundleDisplayName',
    );

    expect(initialDisplayName).toBe(info.iosProjectName);

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that display name was updated
    const changedDisplayName = await parsePlistForKey(
      infoPlistPath,
      'CFBundleDisplayName',
    );

    expect(changedDisplayName).toBe(config.name);
  });

  test('withProductName', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Edit the product name
    config.name = 'TestProductName';

    config = withPlugins(config, [IOSConfig.Name.withProductName]);

    config = withDefaultBaseMods(config);

    const projectPbxprojPath = path.join(
      TEMP_DIR,
      'ios',
      `${info.iosProjectName}.xcodeproj`,
      'project.pbxproj',
    );

    // Check initial state
    const projectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(projectContent).toContain(`PRODUCT_NAME = ${info.iosProjectName}`);

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that product name was updated
    const changedProjectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(changedProjectContent).toContain(`PRODUCT_NAME = "${config.name}"`);
  });

  test('withOrientation', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add orientation configuration to the config
    config.orientation = 'landscape';

    config = withPlugins(config, [IOSConfig.Orientation.withOrientation]);

    config = withDefaultBaseMods(config);

    const infoPlistPath = path.join(
      TEMP_DIR,
      'ios',
      info.iosProjectName,
      'Info.plist',
    );

    const initialOrientation = await parsePlistForKey(
      infoPlistPath,
      'UISupportedInterfaceOrientations',
    );

    expect(initialOrientation).toContain('UIInterfaceOrientationPortrait');
    expect(initialOrientation).toContain('UIInterfaceOrientationLandscapeLeft');
    expect(initialOrientation).toContain(
      'UIInterfaceOrientationLandscapeRight',
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that orientation was updated
    const changedOrientation = await parsePlistForKey(
      infoPlistPath,
      'UISupportedInterfaceOrientations',
    );

    expect(changedOrientation).not.toContain('UIInterfaceOrientationPortrait');
    expect(changedOrientation).toContain('UIInterfaceOrientationLandscapeLeft');
    expect(changedOrientation).toContain(
      'UIInterfaceOrientationLandscapeRight',
    );
  });

  test('withRequiresFullScreen', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add requires full screen configuration to the config
    if (!config.ios) config.ios = {};
    config.ios.requireFullScreen = true;

    config = withPlugins(config, [
      IOSConfig.RequiresFullScreen.withRequiresFullScreen,
    ]);

    config = withDefaultBaseMods(config);

    const infoPlistPath = path.join(
      TEMP_DIR,
      'ios',
      info.iosProjectName,
      'Info.plist',
    );

    // Check initial state
    const initialRequiresFullScreen = await parsePlistForKey(
      infoPlistPath,
      'UIRequiresFullScreen',
    );

    expect(initialRequiresFullScreen).toBeUndefined();

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that requires full screen was added
    const changedRequiresFullScreen = await parsePlistForKey(
      infoPlistPath,
      'UIRequiresFullScreen',
    );
    expect(changedRequiresFullScreen).toBe(true);
  });

  test('withScheme', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add scheme to the config
    config.scheme = 'dev.rockjs.test';

    config = withPlugins(config, [IOSConfig.Scheme.withScheme]);

    config = withDefaultBaseMods(config);

    const infoPlistPath = path.join(
      TEMP_DIR,
      'ios',
      info.iosProjectName,
      'Info.plist',
    );

    // Check initial state
    const initialScheme = await parsePlistForKey(
      infoPlistPath,
      'CFBundleURLTypes',
    );

    expect(initialScheme).toBeUndefined();

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that scheme was added
    const urlTypes = (await parsePlistForKey(
      infoPlistPath,
      'CFBundleURLTypes',
    )) as plist.PlistObject[];

    const changedScheme = urlTypes[0]['CFBundleURLSchemes'];

    expect(changedScheme).toContain(config.scheme);
  });

  test('withUsesNonExemptEncryption', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add uses non exempt encryption to the config
    if (!config.ios) {
      config.ios = {
        config: {
          usesNonExemptEncryption: true,
        },
      };
    }

    config = withPlugins(config, [
      IOSConfig.UsesNonExemptEncryption.withUsesNonExemptEncryption,
    ]);

    config = withDefaultBaseMods(config);

    const infoPlistPath = path.join(
      TEMP_DIR,
      'ios',
      info.iosProjectName,
      'Info.plist',
    );

    // Check initial state
    const initialUsesNonExemptEncryption = await parsePlistForKey(
      infoPlistPath,
      'ITSAppUsesNonExemptEncryption',
    );
    expect(initialUsesNonExemptEncryption).toBeUndefined();

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that uses non exempt encryption was added
    const changedUsesNonExemptEncryption = await parsePlistForKey(
      infoPlistPath,
      'ITSAppUsesNonExemptEncryption',
    );
    expect(changedUsesNonExemptEncryption).toBe(true);
  });

  test('withBuildNumber', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add build number to the config
    if (!config.ios) config.ios = {};
    config.ios.buildNumber = '123';

    config = withPlugins(config, [IOSConfig.Version.withBuildNumber]);

    config = withDefaultBaseMods(config);

    const infoPlistPath = path.join(
      TEMP_DIR,
      'ios',
      info.iosProjectName,
      'Info.plist',
    );

    // Check initial state
    const initialBuildNumber = await parsePlistForKey(
      infoPlistPath,
      'CFBundleVersion',
    );
    expect(initialBuildNumber).toBe('$(CURRENT_PROJECT_VERSION)');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that build number was updated
    const changedBuildNumber = await parsePlistForKey(
      infoPlistPath,
      'CFBundleVersion',
    );
    expect(changedBuildNumber).toBe(config.ios?.buildNumber);
  });

  test('withVersion', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add version to the config
    if (!config.ios) config.ios = {};
    config.ios.version = '2.0.0';

    config = withPlugins(config, [IOSConfig.Version.withVersion]);

    config = withDefaultBaseMods(config);

    const infoPlistPath = path.join(
      TEMP_DIR,
      'ios',
      info.iosProjectName,
      'Info.plist',
    );

    // Check initial state
    const initialVersion = await parsePlistForKey(
      infoPlistPath,
      'CFBundleShortVersionString',
    );
    expect(initialVersion).toBe('$(MARKETING_VERSION)');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that version was updated
    const changedVersion = await parsePlistForKey(
      infoPlistPath,
      'CFBundleShortVersionString',
    );
    expect(changedVersion).toBe(config.ios?.version);
  });

  test('withGoogleServicesFile', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add Google services file to the config
    if (!config.ios) config.ios = {};
    config.ios.googleServicesFile = './GoogleService-Info.plist';

    config = withPlugins(config, [IOSConfig.Google.withGoogleServicesFile]);

    config = withDefaultBaseMods(config);

    const projectPbxprojPath = path.join(
      TEMP_DIR,
      'ios',
      `${info.iosProjectName}.xcodeproj`,
      'project.pbxproj',
    );

    // Check initial state
    const projectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(projectContent).not.toContain('GoogleService-Info.plist');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that Google services file was added
    const changedProjectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(changedProjectContent).toContain('GoogleService-Info.plist');

    const googleServicePath = path.join(
      TEMP_DIR,
      'ios',
      info.iosProjectName,
      'GoogleService-Info.plist',
    );
    const googleServiceFileExists = await fs
      .access(googleServicePath)
      .then(() => true)
      .catch(() => false);
    expect(googleServiceFileExists).toBe(true);
  });

  test('withJsEnginePodfileProps', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add JS engine configuration to the config
    config.jsEngine = 'jsc';

    config = withPlugins(config, [
      IOSConfig.BuildProperties.withJsEnginePodfileProps,
    ]);

    config = withDefaultBaseMods(config);

    // Apply the plugin
    await evalModsAsync(config, info);

    // Expect Podfile.properties.json to be created
    const podfilePropertiesPath = path.join(
      TEMP_DIR,
      'ios',
      'Podfile.properties.json',
    );

    // Expect the property to exist in Podfile.properties.json
    const podfilePropertiesContent = await fs.readFile(
      podfilePropertiesPath,
      'utf8',
    );
    const podfileProperties = JSON.parse(podfilePropertiesContent);
    expect(podfileProperties['expo.jsEngine']).toBe('jsc');
  });

  test('withNewArchEnabledPodfileProps', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add new arch configuration to the config
    if (!config.ios) config.ios = {};
    config.ios.newArchEnabled = true;

    config = withPlugins(config, [
      IOSConfig.BuildProperties.withNewArchEnabledPodfileProps,
    ]);

    config = withDefaultBaseMods(config);

    // Apply the plugin
    await evalModsAsync(config, info);

    // Expect Podfile.properties.json to be created
    const podfilePropertiesPath = path.join(
      TEMP_DIR,
      'ios',
      'Podfile.properties.json',
    );

    // Expect the property to exist in Podfile.properties.json
    const podfilePropertiesContent = await fs.readFile(
      podfilePropertiesPath,
      'utf8',
    );
    const podfileProperties = JSON.parse(podfilePropertiesContent);
    expect(podfileProperties['newArchEnabled']).toBe('true');
  });

  test('withAssociatedDomains', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add associated domains to the config
    if (!config.ios) config.ios = {};
    config.ios.associatedDomains = ['applinks:rock-js.dev'];

    config = withPlugins(config, [
      IOSConfig.Entitlements.withAssociatedDomains,
    ]);

    config = withDefaultBaseMods(config);

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that entitlements file was created with associated domains
    const entitlementsPath = path.join(
      TEMP_DIR,
      'ios',
      info.iosProjectName,
      `${info.iosProjectName}.entitlements`,
    );
    const entitlementsContent = await parsePlistForKey(
      entitlementsPath,
      'com.apple.developer.associated-domains',
    );

    expect(entitlementsContent).toEqual(['applinks:rock-js.dev']);
  });

  test('withDeviceFamily - isTabletOnly', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add device family configuration to the config
    if (!config.ios) config.ios = {};
    config.ios.isTabletOnly = true;

    config = withPlugins(config, [IOSConfig.DeviceFamily.withDeviceFamily]);

    config = withDefaultBaseMods(config);

    const projectPbxprojPath = path.join(
      TEMP_DIR,
      'ios',
      `${info.iosProjectName}.xcodeproj`,
      'project.pbxproj',
    );

    // Check initial state
    const projectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(projectContent).not.toContain('TARGETED_DEVICE_FAMILY');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that device family was updated
    const changedProjectContent = await fs.readFile(projectPbxprojPath, 'utf8');

    expect(changedProjectContent).toContain('TARGETED_DEVICE_FAMILY = "2"');
  });

  test('withDeviceFamily - supportsTablet', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add device family configuration to the config
    if (!config.ios) config.ios = {};
    config.ios.supportsTablet = true;

    config = withPlugins(config, [IOSConfig.DeviceFamily.withDeviceFamily]);

    config = withDefaultBaseMods(config);

    const projectPbxprojPath = path.join(
      TEMP_DIR,
      'ios',
      `${info.iosProjectName}.xcodeproj`,
      'project.pbxproj',
    );

    // Check initial state
    const projectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(projectContent).not.toContain('TARGETED_DEVICE_FAMILY');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that device family was updated
    const changedProjectContent = await fs.readFile(projectPbxprojPath, 'utf8');

    expect(changedProjectContent).toContain('TARGETED_DEVICE_FAMILY = "1,2"');
  });

  test('withBitcode', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add bitcode configuration to the config
    if (!config.ios) config.ios = {};
    config.ios.bitcode = true;

    config = withPlugins(config, [IOSConfig.Bitcode.withBitcode]);

    config = withDefaultBaseMods(config);

    const projectPbxprojPath = path.join(
      TEMP_DIR,
      'ios',
      `${info.iosProjectName}.xcodeproj`,
      'project.pbxproj',
    );

    // Check initial state
    const projectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(projectContent).toContain('ENABLE_BITCODE = NO');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that bitcode was updated
    const changedProjectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(changedProjectContent).toContain('ENABLE_BITCODE = YES');
  });

  test('withLocales', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add locales configuration to the config
    config.locales = {
      en: './locale/en.json',
      pl: './locale/pl.json',
    };

    config = withPlugins(config, [IOSConfig.Locales.withLocales]);

    config = withDefaultBaseMods(config);

    const supportingDirectory = path.join(
      TEMP_DIR,
      'ios',
      info.iosProjectName,
      'Supporting',
    );

    // Supporting directory should not exist
    const supportingDirectoryExists = await fs
      .access(supportingDirectory)
      .then(() => true)
      .catch(() => false);
    expect(supportingDirectoryExists).toBe(false);

    // Apply the plugin
    await evalModsAsync(config, info);

    // Supporting directory for each locale should exist
    const enDirectory = path.join(supportingDirectory, 'en.lproj');
    const plDirectory = path.join(supportingDirectory, 'pl.lproj');

    const [enDirectoryExists, plDirectoryExists] = await Promise.all([
      fs
        .access(enDirectory)
        .then(() => true)
        .catch(() => false),
      fs
        .access(plDirectory)
        .then(() => true)
        .catch(() => false),
    ]);

    expect(enDirectoryExists).toBe(true);
    expect(plDirectoryExists).toBe(true);
  });

  test('withDevelopmentTeam', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add development team configuration to the config
    if (!config.ios) config.ios = {};
    config.ios.appleTeamId = 'ABC123DEF4';

    config = withPlugins(config, [
      IOSConfig.DevelopmentTeam.withDevelopmentTeam,
    ]);

    config = withDefaultBaseMods(config);

    const projectPbxprojPath = path.join(
      TEMP_DIR,
      'ios',
      `${info.iosProjectName}.xcodeproj`,
      'project.pbxproj',
    );

    // Project should not have DEVELOPMENT_TEAM set initially
    const projectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(projectContent).not.toContain('DEVELOPMENT_TEAM');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that development team was updated
    const changedProjectContent = await fs.readFile(projectPbxprojPath, 'utf8');
    expect(changedProjectContent).toContain(config.ios?.appleTeamId);
  });

  test('withPrivacyInfo', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add privacy info configuration to the config
    if (!config.ios) config.ios = {};
    config.ios.privacyManifests = {
      NSPrivacyAccessedAPITypes: [
        {
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryFileTimestamp',
          NSPrivacyAccessedAPITypeReasons: ['0A2A.1'],
        },
      ],
    };

    config = withPlugins(config, [IOSConfig.PrivacyInfo.withPrivacyInfo]);

    config = withDefaultBaseMods(config);

    // Check that 0A2A.1 is not in the PrivacyInfo.xcprivacy file
    const privacyInfoPath = path.join(
      TEMP_DIR,
      'ios',
      info.iosProjectName,
      'PrivacyInfo.xcprivacy',
    );
    const privacyInfoContent = await fs.readFile(privacyInfoPath, 'utf8');
    expect(privacyInfoContent).not.toContain('0A2A.1');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that 0A2A.1 was added to the PrivacyInfo.xcprivacy file
    const changedPrivacyInfoContent = await fs.readFile(
      privacyInfoPath,
      'utf8',
    );
    expect(changedPrivacyInfoContent).toContain('0A2A.1');
  });
});

describe('plugin applies default Android config plugins correctly', () => {
  test('withJsEngineGradleProps', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add JS engine configuration to the config
    config.jsEngine = 'jsc';

    // Use withAndroidExpoPlugins to apply all Android plugins
    config = withAndroidExpoPlugins(config, {
      package: 'com.testpackage.app',
      projectRoot: info.projectRoot,
    });

    config = withDefaultBaseMods(config);

    const gradlePropertiesPath = path.join(
      TEMP_DIR,
      'android',
      'gradle.properties',
    );

    // Check initial state - hermesEnabled should be true by default
    const initialGradleProperties = await fs.readFile(
      gradlePropertiesPath,
      'utf8',
    );
    expect(initialGradleProperties).toContain('hermesEnabled=true');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that hermesEnabled was updated to false (since jsEngine is 'jsc')
    const changedGradleProperties = await fs.readFile(
      gradlePropertiesPath,
      'utf8',
    );
    expect(changedGradleProperties).toContain('hermesEnabled=false');
  });

  test('withNewArchEnabledGradleProps', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add new arch configuration to the config
    if (!config.android) config.android = {};
    config.android.newArchEnabled = false;

    // Use withAndroidExpoPlugins to apply all Android plugins
    config = withAndroidExpoPlugins(config, {
      package: 'com.testpackage.app',
      projectRoot: info.projectRoot,
    });

    config = withDefaultBaseMods(config);

    const gradlePropertiesPath = path.join(
      TEMP_DIR,
      'android',
      'gradle.properties',
    );

    // Check initial state - newArchEnabled should be true by default
    const initialGradleProperties = await fs.readFile(
      gradlePropertiesPath,
      'utf8',
    );
    expect(initialGradleProperties).toContain('newArchEnabled=true');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that newArchEnabled was updated to false
    const changedGradleProperties = await fs.readFile(
      gradlePropertiesPath,
      'utf8',
    );
    expect(changedGradleProperties).toContain('newArchEnabled=false');
  });

  test('withNameSettingsGradle', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add name configuration to the config
    config.name = 'TestAppName';

    // Use withAndroidExpoPlugins to apply all Android plugins
    config = withAndroidExpoPlugins(config, {
      package: 'com.testpackage.app',
      projectRoot: info.projectRoot,
    });

    config = withDefaultBaseMods(config);

    const settingsGradlePath = path.join(
      TEMP_DIR,
      'android',
      'settings.gradle',
    );

    // Check initial state
    const initialSettingsGradle = await fs.readFile(settingsGradlePath, 'utf8');
    expect(initialSettingsGradle).toContain(
      "rootProject.name = 'ExpoConfigPluginsTestApp'",
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that rootProject.name was updated
    const changedSettingsGradle = await fs.readFile(settingsGradlePath, 'utf8');
    expect(changedSettingsGradle).toContain(
      `rootProject.name = '${config.name}'`,
    );
  });

  test('withClassPath', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add Google services configuration to the config
    if (!config.android) config.android = {};
    config.android.googleServicesFile = './google-services.json';

    // Use withAndroidExpoPlugins to apply all Android plugins
    config = withAndroidExpoPlugins(config, {
      package: 'com.testpackage.app',
      projectRoot: info.projectRoot,
    });

    config = withDefaultBaseMods(config);

    const projectBuildGradlePath = path.join(
      TEMP_DIR,
      'android',
      'build.gradle',
    );

    // Check initial state - should not have Google Services classpath
    const initialBuildGradle = await fs.readFile(
      projectBuildGradlePath,
      'utf8',
    );
    expect(initialBuildGradle).not.toContain('com.google.gms:google-services');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that Google Services classpath was added
    const changedBuildGradle = await fs.readFile(
      projectBuildGradlePath,
      'utf8',
    );
    expect(changedBuildGradle).toContain('com.google.gms:google-services');
  });

  test('withApplyPlugin', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add Google services configuration to the config
    if (!config.android) config.android = {};
    config.android.googleServicesFile = './google-services.json';

    // Use withAndroidExpoPlugins to apply all Android plugins
    config = withAndroidExpoPlugins(config, {
      package: 'com.testpackage.app',
      projectRoot: info.projectRoot,
    });

    config = withDefaultBaseMods(config);

    const appBuildGradlePath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'build.gradle',
    );

    // Check initial state - should not have Google Services plugin applied
    const initialAppBuildGradle = await fs.readFile(appBuildGradlePath, 'utf8');
    expect(initialAppBuildGradle).not.toContain(
      "apply plugin: 'com.google.gms.google-services'",
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that Google Services plugin was applied
    const changedAppBuildGradle = await fs.readFile(appBuildGradlePath, 'utf8');
    expect(changedAppBuildGradle).toContain(
      "apply plugin: 'com.google.gms.google-services'",
    );
  });

  test('withPackageGradle', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add package configuration to the config
    if (!config.android) config.android = {};
    config.android.package = 'com.testpackage.app';

    config = withPlugins(config, [AndroidConfig.Package.withPackageGradle]);

    config = withDefaultBaseMods(config);

    const appBuildGradlePath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'build.gradle',
    );

    // Check initial state
    const initialAppBuildGradle = await fs.readFile(appBuildGradlePath, 'utf8');
    expect(initialAppBuildGradle).toContain(
      'namespace "com.expoconfigpluginstestapp"',
    );
    expect(initialAppBuildGradle).toContain(
      'applicationId "com.expoconfigpluginstestapp"',
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that package was updated
    const changedAppBuildGradle = await fs.readFile(appBuildGradlePath, 'utf8');

    expect(changedAppBuildGradle).toContain(
      `namespace '${config.android?.package}'`,
    );
    expect(changedAppBuildGradle).toContain(
      `applicationId '${config.android?.package}'`,
    );
  });

  test('withVersion', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add version configuration to the config
    if (!config.android) config.android = {};
    config.android.version = '2.0.0';
    config.android.versionCode = 123;

    config = withPlugins(config, [AndroidConfig.Version.withVersion]);

    config = withDefaultBaseMods(config);

    const appBuildGradlePath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'build.gradle',
    );

    // Check initial state
    const initialAppBuildGradle = await fs.readFile(appBuildGradlePath, 'utf8');
    expect(initialAppBuildGradle).toContain('versionCode 1');
    expect(initialAppBuildGradle).toContain('versionName "1.0"');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that version was updated
    const changedAppBuildGradle = await fs.readFile(appBuildGradlePath, 'utf8');
    expect(changedAppBuildGradle).toContain(
      `versionCode ${config.android?.versionCode}`,
    );
    expect(changedAppBuildGradle).toContain(
      `versionName "${config.android?.version}"`,
    );
  });

  test('withAllowBackup', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add allow backup configuration to the config
    if (!config.android) config.android = {};
    config.android.allowBackup = true;

    // Use withAndroidExpoPlugins to apply all Android plugins
    config = withAndroidExpoPlugins(config, {
      package: 'com.testpackage.app',
      projectRoot: info.projectRoot,
    });

    config = withDefaultBaseMods(config);

    const manifestPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    );

    // Check initial state
    const initialManifest = await fs.readFile(manifestPath, 'utf8');
    expect(initialManifest).toContain('android:allowBackup="false"');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that allowBackup was updated
    const changedManifest = await fs.readFile(manifestPath, 'utf8');
    expect(changedManifest).toContain('android:allowBackup="true"');
  });

  test('withWindowSoftInputMode', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add window soft input mode configuration to the config
    if (!config.android) config.android = {};
    config.android.softwareKeyboardLayoutMode = 'pan';

    config = withPlugins(config, [
      AndroidConfig.WindowSoftInputMode.withWindowSoftInputMode,
    ]);

    config = withDefaultBaseMods(config);

    const manifestPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    );

    // Check initial state
    const initialManifest = await fs.readFile(manifestPath, 'utf8');

    expect(initialManifest).toContain(
      'android:windowSoftInputMode="adjustResize"',
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that windowSoftInputMode was updated
    const changedManifest = await fs.readFile(manifestPath, 'utf8');

    expect(changedManifest).toContain(
      'android:windowSoftInputMode="adjustPan"',
    );
  });

  test.skip('withPredictiveBackGesture', async () => {});

  test('withAndroidIntentFilters', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add intent filters configuration to the config
    if (!config.android) config.android = {};
    config.android.intentFilters = [
      {
        action: 'android.intent.action.VIEW',
        category: [
          'android.intent.category.DEFAULT',
          'android.intent.category.BROWSABLE',
        ],
        data: {
          scheme: 'https',
          host: 'example.com',
        },
      },
    ];

    // Use withAndroidExpoPlugins to apply all Android plugins
    config = withAndroidExpoPlugins(config, {
      package: 'com.testpackage.app',
      projectRoot: info.projectRoot,
    });

    config = withDefaultBaseMods(config);

    const manifestPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    );

    // Check initial state - should only have the default MAIN intent filter
    const initialManifest = await fs.readFile(manifestPath, 'utf8');
    expect(initialManifest).toContain('android.intent.action.MAIN');
    expect(initialManifest).not.toContain('android.intent.action.VIEW');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that intent filters were added
    const changedManifest = await fs.readFile(manifestPath, 'utf8');
    expect(changedManifest).toContain('android.intent.action.VIEW');
    expect(changedManifest).toContain('android.intent.category.DEFAULT');
    expect(changedManifest).toContain('android.intent.category.BROWSABLE');
    expect(changedManifest).toContain('android:scheme="https"');
    expect(changedManifest).toContain('android:host="example.com"');
  });

  test('withScheme', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add scheme configuration to the config
    config.scheme = 'dev.rockjs.test';

    // Use withAndroidExpoPlugins to apply all Android plugins
    config = withAndroidExpoPlugins(config, {
      package: 'com.testpackage.app',
      projectRoot: info.projectRoot,
    });

    config = withDefaultBaseMods(config);

    const manifestPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    );

    // Check initial state - should not have the scheme intent filter
    const initialManifest = await fs.readFile(manifestPath, 'utf8');
    expect(initialManifest).not.toContain('android:scheme="dev.rockjs.test"');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that scheme was added
    const changedManifest = await fs.readFile(manifestPath, 'utf8');
    expect(changedManifest).toContain(`android:scheme="${config.scheme}"`);
  });

  test('withOrientation', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add orientation configuration to the config
    config.orientation = 'landscape';

    // Use withAndroidExpoPlugins to apply all Android plugins
    config = withAndroidExpoPlugins(config, {
      package: 'com.testpackage.app',
      projectRoot: info.projectRoot,
    });

    config = withDefaultBaseMods(config);

    const manifestPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    );

    // Check initial state - should have configChanges but not screenOrientation
    const initialManifest = await fs.readFile(manifestPath, 'utf8');
    expect(initialManifest).toContain(
      'android:configChanges="keyboard|keyboardHidden|orientation|screenLayout|screenSize|smallestScreenSize|uiMode"',
    );
    expect(initialManifest).not.toContain('android:screenOrientation');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that orientation was added
    const changedManifest = await fs.readFile(manifestPath, 'utf8');
    expect(changedManifest).toContain('android:screenOrientation="landscape"');
  });

  test('withInternalBlockedPermissions', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add internal blocked permissions configuration to the config
    if (!config.android) config.android = {};
    config.android.blockedPermissions = ['android.permission.CAMERA'];

    config = withPlugins(config, [
      AndroidConfig.Permissions.withInternalBlockedPermissions,
    ]);

    config = withDefaultBaseMods(config);

    const manifestPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    );

    // Check initial state - should not have the blocked permission
    const initialManifest = await fs.readFile(manifestPath, 'utf8');
    expect(initialManifest).not.toContain(
      'android:name="android.permission.CAMERA"',
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that blocked permission was added
    const changedManifest = await fs.readFile(manifestPath, 'utf8');

    expect(changedManifest).toContain(
      'android:name="android.permission.CAMERA" tools:node="remove"',
    );
  });

  test('withPermissions', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add permissions configuration to the config
    if (!config.android) config.android = {};
    config.android.permissions = [
      'android.permission.CAMERA',
      'android.permission.ACCESS_FINE_LOCATION',
    ];

    config = withPlugins(config, [AndroidConfig.Permissions.withPermissions]);

    config = withDefaultBaseMods(config);

    const manifestPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'AndroidManifest.xml',
    );

    // Check initial state - should only have INTERNET permission
    const initialManifest = await fs.readFile(manifestPath, 'utf8');
    expect(initialManifest).toContain('android.permission.INTERNET');
    expect(initialManifest).not.toContain('android.permission.CAMERA');
    expect(initialManifest).not.toContain(
      'android.permission.ACCESS_FINE_LOCATION',
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that permissions were added
    const changedManifest = await fs.readFile(manifestPath, 'utf8');
    expect(changedManifest).toContain('android.permission.CAMERA');
    expect(changedManifest).toContain(
      'android.permission.ACCESS_FINE_LOCATION',
    );
  });

  test('withName', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add name configuration to the config
    config.name = 'TestAppName';

    config = withPlugins(config, [AndroidConfig.Name.withName]);

    config = withDefaultBaseMods(config);

    const stringsPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'res',
      'values',
      'strings.xml',
    );

    // Check initial state
    const initialStrings = await fs.readFile(stringsPath, 'utf8');
    expect(initialStrings).toContain('ExpoConfigPluginsTestApp');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that app name was updated
    const changedStrings = await fs.readFile(stringsPath, 'utf8');
    expect(changedStrings).toContain(config.name);
  });

  test.skip('withLocales', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add locales configuration to the config
    config.locales = {
      en: './locale/en.json',
      pl: './locale/pl.json',
    };

    config = withPlugins(config, [AndroidConfig.Locales.withLocales]);

    config = withDefaultBaseMods(config);

    const resDir = path.join(TEMP_DIR, 'android', 'app', 'src', 'main', 'res');

    // Check initial state - should not have locale-specific directories
    const initialResContents = await fs.readdir(resDir);
    expect(initialResContents).not.toContain('values-b+en');
    expect(initialResContents).not.toContain('values-b+pl');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that locale directories were created
    const changedResContents = await fs.readdir(resDir);

    expect(changedResContents).toContain('values-b+en');
    expect(changedResContents).toContain('values-b+pl');

    // Check that strings files were created
    const enStringsPath = path.join(resDir, 'values-b+en', 'strings.xml');
    const plStringsPath = path.join(resDir, 'values-b+pl', 'strings.xml');

    const [enStringsExists, plStringsExists] = await Promise.all([
      fs
        .access(enStringsPath)
        .then(() => true)
        .catch(() => false),
      fs
        .access(plStringsPath)
        .then(() => true)
        .catch(() => false),
    ]);

    expect(enStringsExists).toBe(true);
    expect(plStringsExists).toBe(true);
  });

  test('withGoogleServicesFile', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add Google services file configuration to the config
    if (!config.android) config.android = {};
    config.android.googleServicesFile = './google-services.json';

    config = withPlugins(config, [
      AndroidConfig.GoogleServices.withGoogleServicesFile,
    ]);

    config = withDefaultBaseMods(config);

    const appDir = path.join(TEMP_DIR, 'android', 'app');

    // Check initial state - should not have google-services.json
    const initialAppContents = await fs.readdir(appDir);
    expect(initialAppContents).not.toContain('google-services.json');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that google-services.json was copied
    const changedAppContents = await fs.readdir(appDir);
    expect(changedAppContents).toContain('google-services.json');

    // Check that the file exists
    const googleServicesPath = path.join(appDir, 'google-services.json');
    const googleServicesExists = await fs
      .access(googleServicesPath)
      .then(() => true)
      .catch(() => false);
    expect(googleServicesExists).toBe(true);
  });

  test('withStatusBar', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add status bar configuration to the config
    config.androidStatusBar = {
      barStyle: 'light-content',
      backgroundColor: '#000000',
    };

    config = withPlugins(config, [AndroidConfig.StatusBar.withStatusBar]);

    config = withDefaultBaseMods(config);

    const stylesPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'res',
      'values',
      'styles.xml',
    );

    // Check initial state - should not have status bar styles
    const initialStyles = await fs.readFile(stylesPath, 'utf8');
    expect(initialStyles).not.toContain('android:statusBarColor');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that status bar styles were added
    const changedStyles = await fs.readFile(stylesPath, 'utf8');

    expect(changedStyles).toContain('android:statusBarColor');
    expect(changedStyles).toContain(config.androidStatusBar?.backgroundColor);
  });

  test.skip('withEdgeToEdge', async () => {});

  test.skip('withAndroidIcons', async () => {});

  test('withPrimaryColor', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add primary color configuration to the config
    config.primaryColor = '#FF0000';

    config = withPlugins(config, [AndroidConfig.PrimaryColor.withPrimaryColor]);

    config = withDefaultBaseMods(config);

    const colorsPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'res',
      'values',
      'colors.xml',
    );

    // Check initial state - should not have primary color
    const initialColors = await fs.readFile(colorsPath, 'utf8');
    expect(initialColors).not.toContain('colorPrimary');

    // Apply the plugin
    await evalModsAsync(config, info);

    // Check that primary color was added
    const changedColors = await fs.readFile(colorsPath, 'utf8');
    expect(changedColors).toContain('colorPrimary');
    expect(changedColors).toContain(config.primaryColor);
  });

  test('withPackageRefactor', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    // Add package configuration to the config
    if (!config.android) config.android = {};
    config.android.package = 'dev.rockjs.test';

    config = withPlugins(config, [AndroidConfig.Package.withPackageRefactor]);

    config = withDefaultBaseMods(config);

    const mainActivityPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'java',
      'com',
      'expoconfigpluginstestapp',
      'MainActivity.kt',
    );
    const mainApplicationPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'java',
      'com',
      'expoconfigpluginstestapp',
      'MainApplication.kt',
    );

    // Check initial state - should have old package names
    const [initialMainActivity, initialMainApplication] = await Promise.all([
      fs.readFile(mainActivityPath, 'utf8'),
      fs.readFile(mainApplicationPath, 'utf8'),
    ]);
    expect(initialMainActivity).toContain(
      'package com.expoconfigpluginstestapp',
    );
    expect(initialMainApplication).toContain(
      'package com.expoconfigpluginstestapp',
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    const packageParts = config.android?.package?.split('.') ?? [];

    const refactoredMainActivityPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'java',
      ...packageParts,
      'MainActivity.kt',
    );
    const refactoredMainApplicationPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'java',
      ...packageParts,
      'MainApplication.kt',
    );

    // Check that package names were updated
    const [changedMainActivity, changedMainApplication] = await Promise.all([
      fs.readFile(refactoredMainActivityPath, 'utf8'),
      fs.readFile(refactoredMainApplicationPath, 'utf8'),
    ]);
    expect(changedMainActivity).toContain(`package ${config.android?.package}`);
    expect(changedMainApplication).toContain(
      `package ${config.android?.package}`,
    );
  });
});

describe('plugin applies third-party config plugins correctly', () => {
  test('react-native-bottom-tabs', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    config = withPlugins(config, ['react-native-bottom-tabs']);

    config = withDefaultBaseMods(config);

    const stylesPath = path.join(
      TEMP_DIR,
      'android',
      'app',
      'src',
      'main',
      'res',
      'values',
      'styles.xml',
    );

    // Check initial state - should have AppCompat theme
    const initialStyles = await fs.readFile(stylesPath, 'utf8');

    expect(initialStyles).toContain(
      'parent="Theme.AppCompat.DayNight.NoActionBar"',
    );

    // Apply the plugin
    await evalModsAsync(config, info);

    const changedStyles = await fs.readFile(stylesPath, 'utf8');

    // Check that theme was updated
    expect(changedStyles).toContain(
      'parent="Theme.Material3.DayNight.NoActionBar"',
    );
  });

  test('expo-build-properties', async () => {
    const { appJsonConfig, info } = await getTestConfig();
    let config = withInternal(appJsonConfig, info);

    config = withPlugins(config, [
      [
        'expo-build-properties',
        {
          ios: {
            useFrameworks: 'static',
          },
        },
      ],
    ]);

    config = withDefaultBaseMods(config);

    // Apply the plugin
    await evalModsAsync(config, info);

    // Expect Podfile.properties.json to be created
    const podfilePropertiesPath = path.join(
      TEMP_DIR,
      'ios',
      'Podfile.properties.json',
    );

    // Expect the property to exist in Podfile.properties.json
    const podfilePropertiesContent = await fs.readFile(
      podfilePropertiesPath,
      'utf8',
    );
    const podfileProperties = JSON.parse(podfilePropertiesContent);

    expect(podfileProperties['ios.useFrameworks']).toBe('static');
  });
});
