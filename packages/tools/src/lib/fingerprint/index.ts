import fs from 'node:fs/promises';
import path from 'node:path';
import { calculateFingerprint, type FingerprintResult } from 'fs-fingerprint';
import { getReactNativeVersion, logger } from '../../index.js';
import { spawn } from '../spawn.js';
import { getAllIgnorePaths } from './ignorePaths.js';

export type FingerprintSources = {
  extraSources: string[];
  ignorePaths: string[];
  env: string[];
};

export type FingerprintOptions = {
  platform: 'ios' | 'android' | 'harmony';
  extraSources: string[];
  ignorePaths: string[];
  env: string[];
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
      { cwd: projectRoot, stdio: 'pipe' },
    );

    autolinkingConfig = JSON.parse(autolinkingConfigString);
  } catch {
    throw new Error('Failed to read autolinking config');
  }

  const packageJSONPath = path.join(projectRoot, 'package.json');
  const packageJSON = await readPackageJSON(packageJSONPath);
  const scripts = packageJSON['scripts'];
  const { sourceDir } = autolinkingConfig.project[options.platform];

  if (!options.platform || !sourceDir) {
    throw new Error('No platforms found in autolinking project config');
  }

  const fingerprint = await calculateFingerprint(projectRoot, {
    include: [
      sourceDir,
      ...options.extraSources.map((source) =>
        path.isAbsolute(source) ? path.relative(projectRoot, source) : source,
      ),
    ],
    extraInputs: [
      { key: 'scripts', json: scripts },
      {
        key: 'autolinkingSources',
        json: parseAutolinkingSources(autolinkingConfig),
      },
      {
        key: 'reactNativeVersion',
        json: { version: getReactNativeVersion(projectRoot) },
      },
      ...(options.env.length > 0 ? [{ key: 'env', json: options.env }] : []),
    ],
    exclude: [
      ...getAllIgnorePaths(options.platform, sourceDir, projectRoot),
      ...(options.ignorePaths ?? []),
    ],
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

function toPosixPath(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

function parseAutolinkingSources(config: any): Record<string, any> {
  const { root } = config;
  for (const [depName, depData] of Object.entries<any>(config.dependencies)) {
    try {
      stripAutolinkingAbsolutePaths(depData, root);
    } catch (e) {
      logger.debug(
        `Error adding react-native core autolinking - ${depName}.\n${e}`,
      );
    }
  }
  return config.dependencies;
}

function stripAutolinkingAbsolutePaths(dependency: any, root: string): void {
  const dependencyRoot = dependency.root;
  const posixDependencyRoot = toPosixPath(dependencyRoot);

  dependency.root = toPosixPath(path.relative(root, dependencyRoot));
  for (const platformData of Object.values<any>(dependency.platforms)) {
    for (const [key, value] of Object.entries<any>(platformData ?? {})) {
      const newValue = value?.startsWith?.(posixDependencyRoot)
        ? toPosixPath(path.relative(root, value))
        : value;
      platformData[key] = newValue;
    }
  }
}
