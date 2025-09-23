import fs from 'node:fs';
import path from 'node:path';
import type { FingerprintSources, RemoteBuildCache } from '@rock-js/tools';
import {
  color,
  formatArtifactName,
  intro,
  isInteractive,
  logger,
  outro,
  promptSelect,
  RockError,
  spinner,
} from '@rock-js/tools';
import { getBinaryPath } from '@rock-js/tools';
import type { BuildFlags } from '../build/buildHarmony.js';
import { options } from '../build/buildHarmony.js';
import { runHvigor } from '../runHvigor.js';
import { getDevices } from './hdc.js';
import type { DeviceData } from './listHarmonyDevices.js';
import { listHarmonyDevices } from './listHarmonyDevices.js';
import { tryInstallAppOnDevice } from './tryInstallAppOnDevice.js';
import { tryLaunchAppOnDevice } from './tryLaunchAppOnDevice.js';
// import { tryLaunchEmulator } from './tryLaunchEmulator.js';

export interface Flags extends BuildFlags {
  ability: string;
  port: string;
  device?: string;
  binaryPath?: string;
}

/**
 * Starts the app on a connected HarmonyOS emulator or device.
 */
export async function runHarmony(
  harmonyConfig: {
    sourceDir: string;
    bundleName: string;
  },
  args: Flags,
  projectRoot: string,
  remoteCacheProvider: null | (() => RemoteBuildCache) | undefined,
  fingerprintOptions: FingerprintSources,
) {
  intro('Running HarmonyOS Next app');

  normalizeArgs(args, projectRoot);
  const { sourceDir, bundleName } = harmonyConfig;
  const devices = await listHarmonyDevices();
  const device = await selectDevice(devices, args);

  const artifactName = await formatArtifactName({
    platform: 'harmony',
    traits: [args.buildMode],
    root: projectRoot,
    fingerprintOptions,
  });
  const binaryPath = await getBinaryPath({
    platformName: 'harmony',
    artifactName,
    binaryPathFlag: args.binaryPath,
    localFlag: args.local,
    remoteCacheProvider,
    fingerprintOptions,
    sourceDir: sourceDir,
  });

  if (device) {
    // if (!(await getDevices()).find((d) => d.name === device.deviceId)) {
    //   // deviceId is undefined until it's launched, hence overwriting it here
    //   device.deviceId = await tryLaunchEmulator(device.readableName);
    // }
    if (device.deviceId) {
      if (!binaryPath) {
        // @todo fix sourceDir
        await runHvigor({ sourceDir, args, artifactName, device, bundleName });
      }
      await runOnDevice({ device, sourceDir, args, binaryPath, bundleName });
    }
  } else {
    // @todo consider filtering out offline devices
    console.log(await getDevices());
    if ((await getDevices()).length === 0) {
      if (isInteractive()) {
        await selectAndLaunchDevice();
      } else {
        logger.debug(
          'No booted devices or emulators found. Launching first available emulator.',
        );
        // @todo add simulators
        // await tryLaunchEmulator();
      }
    }

    if (!binaryPath) {
      // @todo revisit
      await runHvigor({ sourceDir, args, artifactName, bundleName });
    }

    for (const device of await listHarmonyDevices()) {
      if (device.connected) {
        await runOnDevice({ device, sourceDir, args, binaryPath, bundleName });
      }
    }
  }

  outro('Success 🎉.');
}

async function selectAndLaunchDevice() {
  const allDevices = await listHarmonyDevices();
  const device = await promptForDeviceSelection(allDevices);

  console.log('sd', device);

  if (!device.connected) {
    // await tryLaunchEmulator(device.readableName);
    // list devices once again when emulator is booted
    const allDevices = await listHarmonyDevices();
    const newDevice =
      allDevices.find((d) => d.readableName === device.readableName) ?? device;
    return newDevice;
  }
  return device;
}

async function selectDevice(devices: DeviceData[], args: Flags) {
  const device = args.device ? matchingDevice(devices, args.device) : undefined;
  if (!device && args.device) {
    logger.warn(
      `No devices or emulators found matching "${args.device}". Using available one instead.`,
    );
  }
  return device;
}

function matchingDevice(devices: Array<DeviceData>, deviceArg: string) {
  const deviceByName = devices.find(
    (device) => device.readableName === deviceArg,
  );
  const deviceById = devices.find((d) => d.deviceId === deviceArg);
  return deviceByName || deviceById;
}

function normalizeArgs(args: Flags, projectRoot: string) {
  if (args.binaryPath) {
    args.binaryPath = path.isAbsolute(args.binaryPath)
      ? args.binaryPath
      : path.join(projectRoot, args.binaryPath);

    if (args.binaryPath && !fs.existsSync(args.binaryPath)) {
      throw new RockError(
        `"--binary-path" was specified, but the file was not found at "${args.binaryPath}".`,
      );
    }
  }
}

async function promptForDeviceSelection(
  allDevices: Array<DeviceData>,
): Promise<DeviceData> {
  if (!allDevices.length) {
    throw new RockError(
      'No devices and/or emulators connected. Please create emulator with DevEco Studio or connect HarmonyOS device.',
    );
  }
  const selected = await promptSelect({
    message: 'Select the device / emulator you want to use',
    options: allDevices.map((d) => ({
      label: `${d.readableName}${
        d.type === 'phone' ? ' - (physical device)' : ''
      }${d.connected ? ' (connected)' : ''}`,
      value: d,
    })),
  });

  return selected;
}

async function runOnDevice({
  device,
  sourceDir,
  args,
  binaryPath,
  bundleName,
}: {
  device: DeviceData;
  sourceDir: string;
  args: Flags;
  binaryPath: string | undefined;
  bundleName: string;
}) {
  const loader = spinner();
  loader.start('Installing the app');
  await tryInstallAppOnDevice(device, sourceDir, args, binaryPath);
  loader.message('Launching the app');
  const { applicationIdWithSuffix } = await tryLaunchAppOnDevice(
    device,
    bundleName,
    args,
  );
  if (applicationIdWithSuffix) {
    loader.stop(
      `Installed and launched the app on ${color.bold(device.readableName)}`,
    );
  } else {
    loader.stop(
      `Failed: installing and launching the app on ${color.bold(
        device.readableName,
      )}`,
    );
  }
}

export const runOptions = [
  ...options,
  {
    name: '--port <number>',
    description: 'Part for packager.',
    default: process.env['RCT_METRO_PORT'] || '8081',
  },
  {
    name: '--ability <string>',
    description: 'Name of the ability to start.',
    default: 'EntryAbility',
  },
  {
    name: '--device <string>',
    description:
      'Explicitly set the device or emulator to use by name or ID (if launched).',
  },
  {
    name: '--binary-path <string>',
    description:
      'Path relative to project root where pre-built .apk binary lives.',
  },
];
