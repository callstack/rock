import { existsSync } from 'node:fs';
import { logger, spawn } from '@rock-js/tools';
import { getHdcPath } from './hdc.js';
import type { AndroidProject } from './runHarmony.js';

export async function findOutputFile(
  androidProject: AndroidProject,
  tasks: string[],
  device?: string,
) {
  const { appName, sourceDir } = androidProject;
  const selectedTask = tasks.find(
    (t) =>
      t.startsWith('install') ||
      t.startsWith('assemble') ||
      t.startsWith('bundle'),
  );
  if (!selectedTask) {
    return false;
  }
  // handle if selected task includes build flavour as well, eg. installProductionDebug should create ['production','debug'] array
  const variantFromSelectedTask = selectedTask
    ?.replace('install', '')
    ?.replace('assemble', '')
    ?.replace('bundle', '')
    .split(/(?=[A-Z])/);

  // create path to output file, eg. `production/debug`
  const variantPath = variantFromSelectedTask?.join('/')?.toLowerCase();
  // create output file name, eg. `production-debug`
  const variantAppName = variantFromSelectedTask?.join('-')?.toLowerCase();
  const apkOrBundle = selectedTask?.includes('bundle') ? 'bundle' : 'apk';
  const buildDirectory = `${sourceDir}/${appName}/build/outputs/${apkOrBundle}/${variantPath}`;
  const outputFile = await getInstallOutputFileName(
    appName,
    variantAppName,
    buildDirectory,
    apkOrBundle === 'apk' ? 'apk' : 'aab',
    device,
  );
  return outputFile ? `${buildDirectory}/${outputFile}` : undefined;
}

async function getInstallOutputFileName(
  appName: string,
  variant: string,
  buildDirectory: string,
  apkOrAab: 'apk' | 'aab',
  device: string | undefined,
) {
  const availableCPUs = await getAvailableCPUs(device);

  // check if there is an apk file like app-armeabi-v7a-debug.apk
  for (const availableCPU of availableCPUs.concat('universal')) {
    const outputFile = `${appName}-${availableCPU}-${variant}.${apkOrAab}`;
    if (existsSync(`${buildDirectory}/${outputFile}`)) {
      return outputFile;
    }
  }

  // check if there is a default file like app-debug.apk
  const outputFile = `${appName}-${variant}.${apkOrAab}`;
  if (existsSync(`${buildDirectory}/${outputFile}`)) {
    return outputFile;
  }

  logger.debug('Could not find the output file:', {
    buildDirectory,
    outputFile,
    appName,
    variant,
    apkOrAab,
  });

  return undefined;
}

/**
 * Gets available CPUs of devices from ADB
 */
async function getAvailableCPUs(device?: string) {
  const adbPath = getHdcPath();
  try {
    const adbArgs = ['shell', 'getprop', 'ro.product.cpu.abilist'];

    if (device) {
      adbArgs.unshift('-s', device);
    }

    const { output } = await spawn(adbPath, adbArgs, { stdio: 'pipe' });

    return output.trim().split(',');
  } catch {
    return [];
  }
}
