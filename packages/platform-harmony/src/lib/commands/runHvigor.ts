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
    loader.stop('Failed to install dependencies with ohpm');
    throw new RockError('Failed to install native dependencies with ohpm.', {
      cause: error,
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
    loader.stop('Failed to build the app');

    const hints = getErrorHints((error as SubprocessError).stdout ?? '');
    throw new RockError(
      hints ||
        'Failed to build the app. See the error above for details from Hvigor.',
    );
  }

  const outputFilePath = await findOutputFile(sourceDir, args.module, device);
  if (outputFilePath) {
    saveLocalBuildCache(artifactName, outputFilePath);
  }
}

function getErrorHints(output: string) {
  const signingMessage = output.includes('validateSigningRelease FAILED')
    ? `Hint: You can run "${color.bold(
        'rock create-keystore:harmony',
      )}" to create a keystore file.`
    : '';
  return signingMessage;
}
