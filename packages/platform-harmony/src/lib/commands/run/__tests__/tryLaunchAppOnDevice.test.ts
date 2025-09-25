import { spawn } from '@rock-js/tools';
import { test, vi } from 'vitest';
import type { DeviceData } from '../listHarmonyDevices.js';
import type { Flags } from '../runHarmony.js';
import { tryLaunchAppOnDevice } from '../tryLaunchAppOnDevice.js';

vi.mock('@rock-js/tools', async () => {
  return {
    ...(await vi.importActual('@rock-js/tools')),
    spawn: vi.fn(() => Promise.resolve({ stdout: '', stderr: '' })),
  };
});

const OLD_ENV = process.env;

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  process.env = { ...OLD_ENV, DEVECO_SDK_HOME: '/mock/deveco/sdk' };
});

afterAll(() => {
  process.env = OLD_ENV;
});

const device: DeviceData = {
  deviceId: '4UQ9K25710015363',
  readableName: 'Emulator 5554',
  connected: true,
  type: 'emulator',
};

const args: Flags = {
  port: '8081',
  buildMode: 'debug',
  module: 'entry',
  product: 'default',
  ability: 'EntryAbility',
  local: true,
};

const bundleName = 'com.example.app';

test('launches hdc shell to force stop and start app on device', async () => {
  await tryLaunchAppOnDevice(device, bundleName, args);

  expect(spawn).toHaveBeenCalledWith(
    '/mock/deveco/sdk/default/openharmony/toolchains/hdc',
    ['-t', '4UQ9K25710015363', 'shell', 'aa', 'force-stop', bundleName],
  );

  expect(spawn).toHaveBeenCalledWith(
    '/mock/deveco/sdk/default/openharmony/toolchains/hdc',
    [
      '-t',
      '4UQ9K25710015363',
      'shell',
      'aa',
      'start',
      '-a',
      'EntryAbility',
      '-b',
      bundleName,
    ],
  );
});

test('launches hdc shell with different ability name', async () => {
  const customArgs = { ...args, ability: 'CustomAbility' };
  await tryLaunchAppOnDevice(device, bundleName, customArgs);

  expect(spawn).toHaveBeenCalledWith(
    '/mock/deveco/sdk/default/openharmony/toolchains/hdc',
    ['-t', '4UQ9K25710015363', 'shell', 'aa', 'force-stop', bundleName],
  );

  expect(spawn).toHaveBeenCalledWith(
    '/mock/deveco/sdk/default/openharmony/toolchains/hdc',
    [
      '-t',
      '4UQ9K25710015363',
      'shell',
      'aa',
      'start',
      '-a',
      'CustomAbility',
      '-b',
      bundleName,
    ],
  );
});

test('launches hdc shell with different bundle name', async () => {
  const customBundleName = 'com.custom.app';
  await tryLaunchAppOnDevice(device, customBundleName, args);

  expect(spawn).toHaveBeenCalledWith(
    '/mock/deveco/sdk/default/openharmony/toolchains/hdc',
    ['-t', '4UQ9K25710015363', 'shell', 'aa', 'force-stop', customBundleName],
  );

  expect(spawn).toHaveBeenCalledWith(
    '/mock/deveco/sdk/default/openharmony/toolchains/hdc',
    [
      '-t',
      '4UQ9K25710015363',
      'shell',
      'aa',
      'start',
      '-a',
      'EntryAbility',
      '-b',
      customBundleName,
    ],
  );
});

test('launches hdc shell with different device id', async () => {
  const customDevice = { ...device, deviceId: 'device-123' };
  await tryLaunchAppOnDevice(customDevice, bundleName, args);

  expect(spawn).toHaveBeenCalledWith(
    '/mock/deveco/sdk/default/openharmony/toolchains/hdc',
    ['-t', 'device-123', 'shell', 'aa', 'force-stop', bundleName],
  );

  expect(spawn).toHaveBeenCalledWith(
    '/mock/deveco/sdk/default/openharmony/toolchains/hdc',
    [
      '-t',
      'device-123',
      'shell',
      'aa',
      'start',
      '-a',
      'EntryAbility',
      '-b',
      bundleName,
    ],
  );
});

test('returns applicationIdWithSuffix when successful', async () => {
  const result = await tryLaunchAppOnDevice(device, bundleName, args);

  expect(result).toEqual({ applicationIdWithSuffix: bundleName });
});

test('handles device without deviceId gracefully', async () => {
  const deviceWithoutId = { ...device, deviceId: undefined };
  const result = await tryLaunchAppOnDevice(deviceWithoutId, bundleName, args);

  expect(result).toEqual({});
  expect(spawn).not.toHaveBeenCalled();
});
