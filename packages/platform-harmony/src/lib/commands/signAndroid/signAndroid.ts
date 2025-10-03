import fs from 'node:fs';
import path from 'node:path';
import type { SubprocessError } from '@rock-js/tools';
import {
  colorLink,
  getDotRockPath,
  intro,
  outro,
  relativeToCwd,
  RockError,
  spawn,
  spinner,
} from '@rock-js/tools';
import AdmZip from 'adm-zip';
import { findAndroidBuildTool, getAndroidBuildToolsPath } from '../../paths.js';
import { buildJsBundle } from './bundle.js';

export type SignAndroidOptions = {
  apkPath: string;
  keystorePath?: string;
  keystorePassword?: string;
  keyAlias?: string;
  keyPassword?: string;
  outputPath?: string;
  buildJsBundle?: boolean;
  jsBundlePath?: string;
  useHermes?: boolean;
};

export async function signAndroid(options: SignAndroidOptions) {
  validateOptions(options);

  intro(`Modifying APK file`);

  const tempPath = getSignOutputPath();
  if (fs.existsSync(tempPath)) {
    fs.rmSync(tempPath, { recursive: true });
  }

  const loader = spinner();

  // 1. Build JS bundle if needed
  if (options.buildJsBundle) {
    const bundleOutputPath = path.join(tempPath, 'index.android.bundle');

    loader.start('Building JS bundle...');
    await buildJsBundle({
      bundleOutputPath,
      assetsDestPath: path.join(tempPath, 'res'),
      sourcemapOutputPath: path.join(
        tempPath,
        'index.android.bundle.packager.map',
      ),
      useHermes: options.useHermes ?? true,
    });
    loader.stop(
      `Built JS bundle: ${colorLink(relativeToCwd(bundleOutputPath))}`,
    );

    options.jsBundlePath = bundleOutputPath;
  }

  // 2. Initialize temporary APK file
  const tempApkPath = path.join(tempPath, 'output-app.apk');

  loader.start('Initializing output APK...');
  try {
    const zip = new AdmZip(options.apkPath);
    // Remove old signature files
    zip.deleteFile('META-INF/*');
    zip.writeZip(tempApkPath);
  } catch (error) {
    throw new RockError(
      `Failed to initialize output APK file: ${options.outputPath}`,
      { cause: (error as SubprocessError).stderr },
    );
  }
  loader.stop(`Initialized output APK.`);

  // 3. Replace JS bundle if provided
  if (options.jsBundlePath) {
    loader.start('Replacing JS bundle...');
    await replaceJsBundle({
      apkPath: tempApkPath,
      jsBundlePath: options.jsBundlePath,
    });
    loader.stop(
      `Replaced JS bundle with ${colorLink(
        relativeToCwd(options.jsBundlePath),
      )}.`,
    );
  }

  // 4. Align APK file
  loader.start('Aligning output APK file...');
  const outputApkPath = options.outputPath ?? options.apkPath;
  await alignApkFile(tempApkPath, outputApkPath);
  loader.stop(
    `Created output APK file: ${colorLink(relativeToCwd(outputApkPath))}.`,
  );

  // 5. Sign APK file
  loader.start('Signing the APK file...');
  const keystorePath = options.keystorePath ?? 'android/app/debug.keystore';
  await signApkFile({
    apkPath: outputApkPath,
    keystorePath,
    keystorePassword: options.keystorePassword ?? 'pass:android',
    keyAlias: options.keyAlias,
    keyPassword: options.keyPassword,
  });
  loader.stop(`Signed the APK file with keystore: ${colorLink(keystorePath)}.`);

  outro('Success 🎉.');
}

function validateOptions(options: SignAndroidOptions) {
  if (!fs.existsSync(options.apkPath)) {
    throw new RockError(`APK file not found "${options.apkPath}"`);
  }

  if (options.buildJsBundle && options.jsBundlePath) {
    throw new RockError(
      'The "--build-jsbundle" flag is incompatible with "--jsbundle". Pick one.',
    );
  }

  if (options.jsBundlePath && !fs.existsSync(options.jsBundlePath)) {
    throw new RockError(`JS bundle file not found "${options.jsBundlePath}"`);
  }
}

type ReplaceJsBundleOptions = {
  apkPath: string;
  jsBundlePath: string;
};

async function replaceJsBundle({
  apkPath,
  jsBundlePath,
}: ReplaceJsBundleOptions) {
  try {
    const zip = new AdmZip(apkPath);
    zip.deleteFile('assets/index.android.bundle');
    zip.addLocalFile(jsBundlePath, 'assets', 'index.android.bundle');
    zip.writeZip(apkPath);
  } catch (error) {
    throw new RockError(
      `Failed to replace JS bundle in destination file: ${apkPath}}`,
      { cause: error },
    );
  }
}

function isSdkGTE35(versionString: string) {
  const match = versionString.match(/build-tools\/([\d.]+)/);
  if (!match) return false;

  return match[1].localeCompare('35.0.0', undefined, { numeric: true }) >= 0;
}

async function alignApkFile(inputApkPath: string, outputApkPath: string) {
  const zipAlignPath = findAndroidBuildTool('zipalign');
  if (!zipAlignPath) {
    throw new RockError(
      `"zipalign" not found in Android Build-Tools directory: ${colorLink(
        getAndroidBuildToolsPath(),
      )}
Please follow instructions at: https://reactnative.dev/docs/set-up-your-environment?platform=android'`,
    );
  }

  // See: https://developer.android.com/tools/zipalign#usage
  const zipalignArgs = [
    // aligns uncompressed .so files to the specified page size in KiB. Available since SDK 35
    ...(isSdkGTE35(zipAlignPath) ? ['-P', '16'] : ['-p']),
    '-f', // Overwrites existing output file.
    '-v', // Overwrites existing output file.
    '4', // alignment in bytes, e.g. '4' provides 32-bit alignment
    inputApkPath,
    outputApkPath,
  ];
  try {
    await spawn(zipAlignPath, zipalignArgs);
  } catch (error) {
    throw new RockError(
      `Failed to align APK file: ${zipAlignPath} ${zipalignArgs.join(' ')}`,
      { cause: (error as SubprocessError).stderr },
    );
  }
}

type SignApkOptions = {
  apkPath: string;
  keystorePath: string;
  keystorePassword: string;
  keyAlias?: string;
  keyPassword?: string;
};

async function signApkFile({
  apkPath,
  keystorePath,
  keystorePassword,
  keyAlias,
  keyPassword,
}: SignApkOptions) {
  if (!fs.existsSync(keystorePath)) {
    throw new RockError(
      `Keystore file not found "${keystorePath}". Provide a valid keystore path using the "--keystore" option.`,
    );
  }

  const apksignerPath = findAndroidBuildTool('apksigner');
  if (!apksignerPath) {
    throw new RockError(
      `"apksigner" not found in Android Build-Tools directory: ${colorLink(
        getAndroidBuildToolsPath(),
      )}
Please follow instructions at: https://reactnative.dev/docs/set-up-your-environment?platform=android'`,
    );
  }

  // apksigner sign --ks-pass "pass:android" --ks "android/app/debug.keystore" --ks-key-alias "androiddebugkey" --key-pass "pass:android" "$OUTPUT2_APK"
  const apksignerArgs = [
    'sign',
    '--ks',
    keystorePath,
    '--ks-pass',
    formatPassword(keystorePassword),
    ...(keyAlias ? ['--ks-key-alias', keyAlias] : []),
    ...(keyPassword ? ['--key-pass', formatPassword(keyPassword)] : []),
    apkPath,
  ];

  try {
    await spawn(apksignerPath, apksignerArgs);
  } catch (error) {
    throw new RockError(
      `Failed to sign APK file: ${apksignerPath} ${apksignerArgs.join(' ')}`,
      { cause: (error as SubprocessError).stderr },
    );
  }
}

/**
 * apksigner expects the password info to be prefixed by the password type.
 *
 * @see https://developer.android.com/tools/apksigner
 */
function formatPassword(password: string) {
  if (
    password.startsWith('pass:') ||
    password.startsWith('env:') ||
    password.startsWith('file:') ||
    password === 'stdin'
  ) {
    return password;
  }

  return `pass:${password}`;
}

function getSignOutputPath() {
  return path.join(getDotRockPath(), 'android/sign');
}
