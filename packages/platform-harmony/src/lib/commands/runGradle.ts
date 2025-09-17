import {
  color,
  logger,
  RockError,
  saveLocalBuildCache,
  spawn,
  spinner,
  type SubprocessError,
} from '@rock-js/tools';
import type { BuildFlags } from './buildAndroid/buildAndroid.js';
import { findOutputFile } from './run/findOutputFile.js';
import { getDevices, getHdcPath } from './run/hdc.js';
import type { AndroidProject, Flags } from './run/runHarmony.js';

export type RunGradleArgs = {
  tasks: string[];
  androidProject: AndroidProject;
  args: BuildFlags | Flags;
  artifactName: string;
};

const getCleanedErrorMessage = (error: SubprocessError) => {
  return error.stderr
    .split('\n')
    .filter((line) => !gradleLinesToRemove.some((l) => line.includes(l)))
    .join('\n')
    .trim();
};

export async function runGradle({
  tasks,
  androidProject,
  args,
  artifactName,
}: RunGradleArgs) {
  const humanReadableTasks = tasks.join(', ');
  const { appId, appIdSuffix } = args as Flags;
  const { applicationId } = androidProject;
  const applicationIdWithSuffix = [appId || applicationId, appIdSuffix]
    .filter(Boolean)
    .join('.');

  logger.log(`Build Settings:
App ID    ${color.bold(color.blue(applicationIdWithSuffix))}
Variant   ${color.bold(args.variant)}
Tasks     ${color.bold(humanReadableTasks)}`);

  const loader = spinner({ indicator: 'timer' });
  const message = `Building the app`;

  loader.start(message);
  const gradleArgs = getTaskNames(androidProject.appName, tasks);

  gradleArgs.push('-x', 'lint');

  if (args.extraParams) {
    gradleArgs.push(...args.extraParams);
  }

  if ('port' in args && args.port != null) {
    gradleArgs.push('-PreactNativeDevServerPort=' + args.port);
  }

  // if (args.activeArchOnly) {
  //   const devices = await getDevices();
  //   const cpus = await Promise.all(devices.map(getCPU));
  //   const architectures = cpus.filter(
  //     (arch, index, array) => arch != null && array.indexOf(arch) === index,
  //   );

  //   if (architectures.length > 0) {
  //     gradleArgs.push('-PreactNativeArchitectures=' + architectures.join(','));
  //   }
  // }

  const gradleWrapper = getGradleWrapper();

  try {
    await spawn(gradleWrapper, gradleArgs, { cwd: androidProject.sourceDir });
    loader.stop(`Built the app`);
  } catch (error) {
    loader.stop('Failed to build the app');
    const cleanedErrorMessage = getCleanedErrorMessage(
      error as SubprocessError,
    );

    if (cleanedErrorMessage) {
      logger.error(cleanedErrorMessage);
    }

    const hints = getErrorHints((error as SubprocessError).stdout ?? '');
    throw new RockError(
      hints ||
        'Failed to build the app. See the error above for details from Gradle.',
    );
  }

  const outputFilePath = await findOutputFile(androidProject, tasks);
  if (outputFilePath) {
    saveLocalBuildCache(artifactName, outputFilePath);
  }
}

function getErrorHints(output: string) {
  const signingMessage = output.includes('validateSigningRelease FAILED')
    ? `Hint: You can run "${color.bold(
        'rock create-keystore:android',
      )}" to create a keystore file.`
    : '';
  return signingMessage;
}

const gradleLinesToRemove = [
  'FAILURE: Build failed with an exception.',
  '* Try:',
  '> Run with --stacktrace option to get the stack trace.',
  '> Run with --info or --debug option to get more log output.',
  '> Run with --scan to get full insights.',
  '> Get more help at [undefined](https://help.gradle.org).',
  '> Get more help at https://help.gradle.org.',
  'BUILD FAILED',
];

export function getGradleWrapper() {
  return process.platform.startsWith('win') ? 'gradlew.bat' : './gradlew';
}

function getTaskNames(appName: string, tasks: string[]): Array<string> {
  return tasks.map((task) => `${appName}:${task}`);
}

/**
 * Gets the CPU architecture of a device from ADB
 */
async function getCPU(device: string) {
  const adbPath = getHdcPath();
  try {
    const { output } = await spawn(
      adbPath,
      ['-s', device, 'shell', 'getprop', 'ro.product.cpu.abi'],
      { stdio: 'pipe' },
    );
    const cpus = output.trim();
    return cpus.length > 0 ? cpus : null;
  } catch {
    return null;
  }
}
