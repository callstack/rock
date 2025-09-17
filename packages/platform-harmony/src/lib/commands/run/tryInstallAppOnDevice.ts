import {
  color,
  logger,
  RockError,
  spawn,
  type SubprocessError,
} from '@rock-js/tools';
import { getHdcPath } from './hdc.js';
import { findOutputFile } from './findOutputFile.js';
import type { DeviceData } from './listAndroidDevices.js';
import { promptForUser } from './listAndroidUsers.js';
import type { AndroidProject, Flags } from './runHarmony.js';

export async function tryInstallAppOnDevice(
  device: DeviceData,
  androidProject: AndroidProject,
  args: Flags,
  tasks: string[],
  binaryPath: string | undefined,
) {
  let deviceId: string;
  if (!device.deviceId) {
    logger.debug(
      `No device with id "${device.deviceId}", skipping launching the app.`,
    );
    return;
  } else {
    deviceId = device.deviceId;
  }
  logger.debug(`Connected to device ${color.bold(device.readableName)}`);
  let pathToApk: string;
  if (!binaryPath) {
    const outputFilePath = await findOutputFile(
      androidProject,
      tasks,
      deviceId,
    );
    if (!outputFilePath) {
      logger.warn(
        "Skipping installation because there's no build output file.",
      );
      return;
    }
    pathToApk = outputFilePath;
  } else {
    pathToApk = binaryPath;
  }

  const adbArgs = ['-s', deviceId, 'install', '-r', '-d'];
  const user = args.user ?? (await promptForUser(deviceId))?.id;

  if (user !== undefined) {
    adbArgs.push('--user', `${user}`);
  }

  adbArgs.push(pathToApk);

  const adbPath = getHdcPath();
  try {
    await spawn(adbPath, adbArgs, { stdio: 'pipe' });
  } catch (error) {
    logger.debug(`Failed: Installing the app`, error);
    const errorMessage =
      (error as SubprocessError).stderr || (error as SubprocessError).stdout;
    const isInsufficientStorage = errorMessage.includes(
      'INSTALL_FAILED_INSUFFICIENT_STORAGE',
    );
    const isUpdateIncompatible = errorMessage.includes(
      'INSTALL_FAILED_UPDATE_INCOMPATIBLE',
    );
    if (isInsufficientStorage || isUpdateIncompatible) {
      try {
        const message = isInsufficientStorage
          ? 'Recovery: Trying to re-install the app due to insufficient storage'
          : 'Recovery: Trying to re-install the app due to binary incompatibility';
        logger.debug(message);
        const appId = args.appId || androidProject.applicationId;
        await spawn(adbPath, ['-s', deviceId, 'uninstall', appId]);
        await spawn(adbPath, adbArgs);
        logger.debug(`Recovery: Re-installed the app`);
        return;
      } catch (error) {
        const errorMessage =
          (error as SubprocessError).stderr ||
          (error as SubprocessError).stdout;
        throw new RockError(`The "adb" command failed with: ${errorMessage}.`);
      }
    }

    throw new RockError(`The "adb" command failed with: ${errorMessage}.`);
  }
}
