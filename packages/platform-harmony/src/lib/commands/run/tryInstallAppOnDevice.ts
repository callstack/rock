import path from 'node:path';
import {
  color,
  colorLink,
  logger,
  RockError,
  spawn,
  type SubprocessError,
} from '@rock-js/tools';
import { findOutputFile } from './findOutputFile.js';
import { getHdcPath } from './hdc.js';
import type { DeviceData } from './listHarmonyDevices.js';
import type { Flags } from './runHarmony.js';

export async function tryInstallAppOnDevice(
  device: DeviceData,
  sourceDir: string,
  args: Flags,
  binaryPath: string | undefined,
) {
  if (!device.deviceId) {
    logger.debug(
      `No device with id "${device.deviceId}", skipping launching the app.`,
    );
    return;
  }
  logger.debug(`Connected to device ${color.bold(device.readableName)}`);
  let pathToHap: string;
  if (!binaryPath) {
    const outputFilePath = await findOutputFile(sourceDir, args.module, device);
    if (!outputFilePath) {
      if (device.type === 'phone') {
        throw new RockError(
          `There was no signed build output file for the physical device. 
This usually means you're missing signing config in your ${colorLink(
            path.join(sourceDir, 'build-profile.json5'),
          )} file. 
Please open DevEco Studio, proceed to: ${color.bold('File > Project Structure... > Signing Configs')}
and log in to your Huawei account to fill the signing information.`,
        );
      } else {
        logger.warn(
          "Skipping installation because there's no build output file.",
        );
        return;
      }
    }
    pathToHap = outputFilePath;
  } else {
    pathToHap = binaryPath;
  }
  const hdcPath = getHdcPath();

  try {
    await spawn(hdcPath, ['-t', device.deviceId, 'install', '-r', pathToHap]);
  } catch (error) {
    const errorMessage =
      (error as SubprocessError).stderr || (error as SubprocessError).stdout;
    if (errorMessage.includes('failed to install')) {
      throw new RockError(
        `Installation failed. If an application with the same bundle name is already installed, try uninstalling it`,
        { cause: error },
      );
    }
  }
}
