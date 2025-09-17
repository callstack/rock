import { logger, RockError, spawn, type SubprocessError } from '@rock-js/tools';
import { getHdcPath } from './hdc.js';
import type { DeviceData } from './listAndroidDevices.js';
import type { AndroidProject, Flags } from './runHarmony.js';
import { tryRunHdcReverse } from './tryRunHdcReverse.js';

export async function tryLaunchAppOnDevice(
  device: DeviceData,
  androidProject: AndroidProject,
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
  const { appId, appIdSuffix } = args;
  const { packageName, mainActivity, applicationId } = androidProject;

  const applicationIdWithSuffix = [appId || applicationId, appIdSuffix]
    .filter(Boolean)
    .join('.');

  const activity = args.mainActivity ?? mainActivity;

  const activityToLaunch =
    activity.startsWith(packageName) ||
    (!activity.startsWith('.') && activity.includes('.'))
      ? activity
      : activity.startsWith('.')
        ? [packageName, activity].join('')
        : [packageName, activity].filter(Boolean).join('.');

  // Here we're using the same flags as Android Studio to launch the app
  const adbArgs = [
    'shell',
    'am',
    'start',
    '-n',
    `${applicationIdWithSuffix}/${activityToLaunch}`,
    '-a',
    'android.intent.action.MAIN',
    '-c',
    'android.intent.category.LAUNCHER',
  ];

  adbArgs.unshift('-s', deviceId);

  const adbPath = getHdcPath();
  logger.debug(`Running ${adbPath} ${adbArgs.join(' ')}.`);
  try {
    await spawn(adbPath, adbArgs);
  } catch (error) {
    throw new RockError(`Failed to launch the app on ${device.readableName}`, {
      cause: (error as SubprocessError).stderr,
    });
  }
  return { applicationIdWithSuffix };
}
