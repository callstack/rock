import * as fs from 'node:fs/promises';
import { withPlugins } from './ExpoConfigPlugins.js';
import { compileModsAsync } from './plugins/modCompiler.js';
import { withInternal } from './plugins/withInternal.js';
import type { ProjectInfo } from './types.js';

/**
 * Applies config plugins.
 */
export async function applyConfigPlugins(info: ProjectInfo) {
  if (!info.appJsonPath) {
    return;
  }

  const content = await fs.readFile(info.appJsonPath, { encoding: 'utf-8' });
  const { expo, ...rest } = JSON.parse(content);
  const appJsonConfig = expo || rest;

  const updatedInfo = {
    ...info,
    iosBundleIdentifier:
      appJsonConfig.ios?.bundleIdentifier ?? info.iosBundleIdentifier,
    androidPackageName:
      appJsonConfig.android?.package ?? info.androidPackageName,
  };

  return compileModsAsync(
    withPlugins(
      withInternal(appJsonConfig, updatedInfo),
      appJsonConfig.plugins ?? [],
    ),
    updatedInfo,
  );
}
