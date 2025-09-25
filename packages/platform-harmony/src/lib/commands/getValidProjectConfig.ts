import fs from 'node:fs';
import path from 'node:path';
import { logger, RockError } from '@rock-js/tools';
import json5 from 'json5';

export type HarmonyProjectConfig = {
  sourceDir: string;
  bundleName: string;
  signingConfigs: boolean | undefined;
};

export function getValidProjectConfig(
  projectRoot: string,
  pluginConfig?: Partial<HarmonyProjectConfig>,
) {
  const sourceDir = pluginConfig?.sourceDir
    ? path.isAbsolute(pluginConfig?.sourceDir)
      ? pluginConfig?.sourceDir
      : path.join(projectRoot, pluginConfig?.sourceDir)
    : path.join(projectRoot, 'harmony');

  if (!fs.existsSync(sourceDir)) {
    throw new RockError(`Harmony project not found under ${sourceDir}.`);
  }

  let bundleName: string;
  try {
    bundleName = json5.parse(
      fs.readFileSync(path.join(sourceDir, 'AppScope', 'app.json5'), 'utf8'),
    ).app.bundleName;
  } catch (error) {
    throw new RockError('Error reading app.json5 file.', {
      cause: error,
    });
  }

  let signingConfigs;
  try {
    const buildProfile = json5.parse(
      fs.readFileSync(path.join(sourceDir, 'build-profile.json5'), 'utf8'),
    );
    signingConfigs = Boolean(buildProfile.app.signingConfigs);
  } catch (error) {
    logger.debug('Error reading build-profile.json5 file.', {
      cause: (error as Error).message,
    });
  }

  return {
    sourceDir,
    bundleName,
    signingConfigs,
  };
}
