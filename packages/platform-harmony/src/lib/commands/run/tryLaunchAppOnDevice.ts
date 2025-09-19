import { logger, RockError, spawn, type SubprocessError } from '@rock-js/tools';
import { getHdcPath } from './hdc.js';
import type { DeviceData } from './listHarmonyDevices.js';
import type { Flags } from './runHarmony.js';
import { tryRunHdcReverse } from './tryRunHdcReverse.js';

export async function tryLaunchAppOnDevice(
  device: DeviceData,
  bundleName: string,
  args: Flags,
) {
  let deviceId;
  if (!device.deviceId) {
    logger.debug(
      `No device with id "${device.deviceId}", skipping launching the app.`,
    );
    return {};
  } else {
    deviceId = device.deviceId;
  }
  await tryRunHdcReverse(args.port, deviceId);

  const hdcPath = getHdcPath();

  try {
    await spawn(hdcPath, [
      '-t',
      device.deviceId,
      'shell',
      'aa',
      'force-stop',
      bundleName,
    ]);
    await spawn(hdcPath, [
      '-t',
      device.deviceId,
      'shell',
      'aa',
      'start',
      '-a',
      args.ability,
      '-b',
      bundleName,
    ]);
  } catch (error) {
    throw new RockError(`Failed to launch the app on ${device.readableName}`, {
      cause: (error as SubprocessError).stderr,
    });
  }

  return { applicationIdWithSuffix: bundleName };
}
