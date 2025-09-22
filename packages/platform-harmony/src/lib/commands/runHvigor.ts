import path from 'node:path';
import {
  color,
  logger,
  RockError,
  saveLocalBuildCache,
  spawn,
  spinner,
  type SubprocessError,
} from '@rock-js/tools';
import { getDevEcoBuildToolsPath } from '../paths.js';
import type { BuildFlags } from './build/buildHarmony.js';
import { findOutputFile } from './run/findOutputFile.js';
import type { DeviceData } from './run/listHarmonyDevices.js';
import type { Flags } from './run/runHarmony.js';

export type RunHvigorArgs = {
  sourceDir: string;
  bundleName: string;
  args: BuildFlags | Flags;
  artifactName: string;
  device?: DeviceData;
};

async function runOhpm(sourceDir: string, loader: ReturnType<typeof spinner>) {
  loader.message('Installing dependencies with ohpm');

  const ohpmPath = path.join(
    getDevEcoBuildToolsPath(),
    'ohpm',
    'bin',
    process.platform === 'win32' ? 'ohpm.bat' : 'ohpm',
  );

  try {
    await spawn(ohpmPath, ['install', '--all', '--strict_ssl', 'true'], {
      cwd: sourceDir,
    });
  } catch (error) {
    loader.stop('Failed to install dependencies with ohpm', 1);
    throw new RockError('Failed to install native dependencies with ohpm', {
      cause: (error as SubprocessError).output,
    });
  }
}

export async function runHvigor({
  sourceDir,
  bundleName,
  args,
  artifactName,
  device,
}: RunHvigorArgs) {
  logger.log(`Build Settings:
Bundle Name   ${color.bold(bundleName)}
Build Mode    ${color.bold(args.buildMode)}`);

  const loader = spinner({ indicator: 'timer' });
  const message = `Building the app`;

  loader.start(message);

  await runOhpm(sourceDir, loader);

  const hvigorPath = path.join(
    getDevEcoBuildToolsPath(),
    'hvigor',
    'bin',
    'hvigorw.js',
  );

  try {
    loader.message('Building the app with Hvigor');
    await spawn(
      'node',
      [
        hvigorPath,
        `-p`,
        `module=${args.module}@default`,
        `-p`,
        `product=${args.product}`,
        `-p`,
        `buildMode=${args.buildMode}`,
        `-p`,
        `requiredDeviceType=phone`,
        `assembleHap`,
      ],
      { cwd: sourceDir },
    );
    loader.stop(`Built the app`);
  } catch (error) {
    loader.stop('Failed to build the app', 1);

    throw new RockError('Failed to build the app with Hvigor', {
      cause: (error as SubprocessError).output,
    });
  }

  const outputFilePath = await findOutputFile(sourceDir, args.module, device);
  if (outputFilePath) {
    saveLocalBuildCache(artifactName, outputFilePath);
  }
}
