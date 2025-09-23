import path from 'node:path';

export function getDevEcoSdkPath() {
  const sdkRoot = process.env['DEVECO_SDK_HOME'];
  if (!sdkRoot) {
    throw new Error(
      'DEVECO_SDK_HOME environment variable is not set. Please set it and run again',
    );
  }
  return sdkRoot;
}

export function getDevEcoBuildToolsPath() {
  return path.join(getDevEcoSdkPath(), '..', 'tools');
}

