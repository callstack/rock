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
  binaryPath: string;
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

  const extension = path.extname(options.binaryPath).slice(1);

  intro(`Modifying ${extension.toUpperCase()} file`);

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

  // 2. Initialize temporary archive file
  const tempArchivePath = path.join(tempPath, `output-app.${extension}`);

  loader.start(`Initializing output ${extension.toUpperCase()}...`);
  try {
    const zip = new AdmZip(options.binaryPath);
    // Remove old signature files
    zip.deleteFile('META-INF/*');
    zip.writeZip(tempArchivePath);
  } catch (error) {
    throw new RockError(
      `Failed to initialize output file: ${options.outputPath}`,
      { cause: (error as SubprocessError).stderr },
    );
  }
  loader.stop(`Initialized output file.`);

  // 3. Replace JS bundle if provided
  if (options.jsBundlePath) {
    loader.start('Replacing JS bundle...');
    await replaceJsBundle({
      archivePath: tempArchivePath,
      jsBundlePath: options.jsBundlePath,
    });
    loader.stop(
      `Replaced JS bundle with ${colorLink(
        relativeToCwd(options.jsBundlePath),
      )}.`,
    );
  }

  // 4. Align archive before signing if apk
  // sign/align sequence is important, see https://developer.android.com/tools/zipalign
  const outputPath = options.outputPath ?? options.binaryPath;

  const alignArchive = async () => {
    loader.start('Aligning output file...');
    await alignArchiveFile(tempArchivePath, outputPath);
    loader.stop(
      `Created output ${extension.toUpperCase()} file: ${colorLink(relativeToCwd(outputPath))}.`,
    );
  }

  if (!isAab(options.binaryPath)) {
    await alignArchive()
  }

  // 5. Sign archive file
  loader.start(`Signing the ${extension.toUpperCase()} file...`);
  const keystorePath = options.keystorePath ?? 'android/app/debug.keystore';

  const signArgs = {
    binaryPath: outputPath,
    keystorePath,
    keystorePassword: options.keystorePassword ?? 'pass:android',
    keyAlias: options.keyAlias,
    keyPassword: options.keyPassword,
  }
  
  if (isAab(options.binaryPath)) {
    await signAab(signArgs);
  } else {
    await signApk(signArgs);
  }
  loader.stop(`Signed the ${extension.toUpperCase()} file with keystore: ${colorLink(keystorePath)}.`);

  // 6. Align archive after signing if aab
  // sign/align sequence is important, see https://developer.android.com/tools/zipalign
  if (isAab(options.binaryPath)) {
    await alignArchive()
  }

  outro('Success 🎉.');
}

function validateOptions(options: SignAndroidOptions) {
  if (!fs.existsSync(options.binaryPath)) {
    throw new RockError(`File not found "${options.binaryPath}"`);
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
  archivePath: string;
  jsBundlePath: string;
};

async function replaceJsBundle({
  archivePath,
  jsBundlePath,
}: ReplaceJsBundleOptions) {
  try {
    const zip = new AdmZip(archivePath);
    const assetsPath = isAab(archivePath) ? 'base/assets' : 'assets';

    zip.deleteFile(path.join(assetsPath, 'index.android.bundle'));
    zip.addLocalFile(jsBundlePath, assetsPath, 'index.android.bundle');
    zip.writeZip(archivePath);
  } catch (error) {
    throw new RockError(
      `Failed to replace JS bundle in destination file: ${archivePath}}`,
      { cause: error },
    );
  }
}

function isSdkGTE35(versionString: string) {
  const match = versionString.match(/build-tools\/([\d.]+)/);
  if (!match) return false;

  return match[1].localeCompare('35.0.0', undefined, { numeric: true }) >= 0;
}

async function alignArchiveFile(inputArchivePath: string, outputPath: string) {
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
    inputArchivePath,
    outputPath,
  ];
  try {
    await spawn(zipAlignPath, zipalignArgs);
  } catch (error) {
    throw new RockError(
      `Failed to align archive file: ${zipAlignPath} ${zipalignArgs.join(' ')}`,
      { cause: (error as SubprocessError).stderr },
    );
  }
}

type SignOptions = {
  binaryPath: string;
  keystorePath: string;
  keystorePassword: string;
  keyAlias?: string;
  keyPassword?: string;
};

async function signAab({
  binaryPath,
  keystorePath,
  keystorePassword,
  keyAlias,
  keyPassword,
}: SignOptions) {
  if (!fs.existsSync(keystorePath)) {
    throw new RockError(
      `Keystore file not found "${keystorePath}". Provide a valid keystore path using the "--keystore" option.`,
    );
  }

  if (!keyAlias) {
    throw new RockError('Missing or empty alias. A valid alias must be provided using the "--key-alias" option.')
  }

  // For AAB files, we use jarsigner instead of apksigner
  // jarsigner -keystore "" -storepass "" -keypass "" <path> <alias>
  const jarsignerArgs = [
    "-keystore",
    keystorePath,
    "-storepass",
    stripPassword(keystorePassword),
    ...(keyPassword ? ['-keypass', stripPassword(keyPassword)] : []),
    binaryPath,
    keyAlias
  ];

  try {
    await spawn('jarsigner', jarsignerArgs);
  } catch (error) {
    throw new RockError(
      `Failed to sign AAB file: jarsigner ${jarsignerArgs.join(' ')}`,
      { cause: (error as SubprocessError).stderr },
    );
  }
}

async function signApk({
  binaryPath,
  keystorePath,
  keystorePassword,
  keyAlias,
  keyPassword,
}: SignOptions) {
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
    binaryPath,
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

/**
 * jarsigner expects password info with no prefixes
 *
 * @see https://docs.oracle.com/javase/6/docs/technotes/tools/windows/jarsigner.html
 */
function stripPassword(password: string) {
  return password.replace(/^(pass:|env:|file:)/, '');
}

function getSignOutputPath() {
  return path.join(getDotRockPath(), 'android/sign');
}

function isAab(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.aab';
}