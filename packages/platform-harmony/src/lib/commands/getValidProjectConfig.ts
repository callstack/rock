import fs from 'node:fs';
import path from 'node:path';
import { logger, RockError } from '@rock-js/tools';
import json5 from 'json5';

export type HarmonyProjectConfig = {
  sourceDir: string;
  bundleName: string;
};

export function getValidProjectConfig(
  projectRoot: string,
  pluginConfig?: Partial<HarmonyProjectConfig>,
) {
  const sourceDir = pluginConfig?.sourceDir ?? 'harmony';
  if (!fs.existsSync(path.join(projectRoot, sourceDir))) {
    throw new RockError(
      `Harmony project not found under ${path.join(projectRoot, sourceDir)}.`,
    );
  }

  let bundleName: string;
  try {
    bundleName = json5.parse(
      fs.readFileSync(
        path.join(projectRoot, sourceDir, 'AppScope', 'app.json5'),
        'utf8',
      ),
    ).app.bundleName;
  } catch (error) {
    throw new RockError('Error reading app.json5 file.', {
      cause: error,
    });
  }

  let signingConfigs: string | undefined;
  try {
    const buildProfile = json5.parse(
      fs.readFileSync(
        path.join(projectRoot, sourceDir, 'build-profile.json5'),
        'utf8',
      ),
    );
    signingConfigs = buildProfile.app.signingConfigs;
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
