import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { calculateFingerprint, type FingerprintResult } from 'fs-fingerprint';
import { spawn } from '../spawn.js';
import { IGNORE_PATHS } from './constants.js';

export type FingerprintSources = {
  extraSources: string[];
  ignorePaths: string[];
};

export type FingerprintOptions = {
  platform: 'ios' | 'android';
  extraSources: string[];
  ignorePaths: string[];
};

/**
 * Calculates the fingerprint of the native parts project of the project.
 */
export async function nativeFingerprint(
  projectRoot: string,
  options: FingerprintOptions,
): Promise<FingerprintResult> {
  let autolinkingConfig;

  try {
    // Use stdout to avoid deprecation warnings
    const { stdout: autolinkingConfigString } = await spawn(
      'rock',
      ['config', '-p', options.platform],
      { cwd: projectRoot, stdio: 'pipe', preferLocal: true },
    );

    autolinkingConfig = JSON.parse(autolinkingConfigString);
  } catch {
    throw new Error('Failed to read autolinking config');
  }

  const packageJSONPath = path.join(projectRoot, 'package.json');
  const packageJSON = await readPackageJSON(packageJSONPath);
  const scripts = packageJSON['scripts'];
  const require = createRequire(import.meta.url);

  const rnPackageJSONPath = require.resolve('react-native/package.json', {
    paths: [projectRoot],
  });

  const folders = Object.keys(autolinkingConfig.project).map((key) => {
    return autolinkingConfig.project[key].sourceDir;
  });

  if (folders.length === 0) {
    throw new Error('No folders found in autolinking config');
  }

  const fingerprint = await calculateFingerprint(projectRoot, {
    include: [rnPackageJSONPath, ...folders, options.extraSources],
    extraInputs: [
      { key: 'scripts', json: scripts },
      { key: 'autolinkingSources', json: autolinkingConfig },
    ],
    exclude: [...IGNORE_PATHS, ...(options.ignorePaths ?? [])],
  });

  return fingerprint;
}

const readPackageJSON = async (packageJSONPath: string) => {
  try {
    const packageJSONContent = await fs.readFile(packageJSONPath, 'utf-8');
    return JSON.parse(packageJSONContent);
  } catch {
    throw new Error(`Failed to read package.json at: ${packageJSONPath}`);
  }
};
