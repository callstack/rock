import * as tools from '@rock-js/tools';
import { RockError, spawn } from '@rock-js/tools';
import type { Mock } from 'vitest';
import { test, vi } from 'vitest';
import type { HarmonyProjectConfig } from '../../getValidProjectConfig.js';
import { type BuildFlags, buildHarmony } from '../buildHarmony.js';

const args: BuildFlags = {
  buildMode: 'debug',
  module: 'entry',
  product: 'default',
  extraParams: undefined,
  local: true,
};
const harmonyProject: HarmonyProjectConfig = {
  sourceDir: '/harmony',
  bundleName: 'test',
  signingConfigs: true,
};

const fingerprintOptions = {
  extraSources: [],
  ignorePaths: [],
  env: [],
};

const spinnerMock = vi.hoisted(() => ({
  start: vi.fn(),
  stop: vi.fn(),
  message: vi.fn(),
}));

vi.spyOn(tools, 'spinner').mockImplementation(() => spinnerMock);

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

function mockOhpmCall(file: string, args: string[]) {
  return file.includes('ohpm') && args?.[0] === 'install';
}

function spawnMockImplementation(file: string, args: string[]) {
  if (mockOhpmCall(file, args)) {
    return { output: 'install completed in 0s 22ms' };
  }
  return { output: '...' };
}

test('buildAndroid runs gradle build with correct configuration for debug and outputs build path', async () => {
  (spawn as Mock).mockImplementation((file, args) =>
    spawnMockImplementation(file, args),
  );

  await buildHarmony(
    harmonyProject,
    { ...args },
    '/root',
    null,
    fingerprintOptions,
  );

  expect(spawn).toBeCalledWith(
    'node',
    [
      expect.stringContaining('hvigorw.js'),
      '-p',
      'module=entry@default',
      '-p',
      'product=default',
      '-p',
      'buildMode=debug',
      '-p',
      'requiredDeviceType=phone',
      'assembleHap',
    ],
    {
      cwd: '/harmony',
    },
  );
  expect(spinnerMock.stop).toBeCalledWith('Built the app');
});

test('buildHarmony fails gracefully when hvigor errors', async () => {
  (spawn as Mock).mockImplementation((file, args) => {
    if (file === 'node' && args?.[0]?.includes('hvigorw.js')) {
      throw new RockError('hvigor error');
    }
    return spawnMockImplementation(file, args);
  });

  await expect(
    buildHarmony(harmonyProject, args, '/root', null, fingerprintOptions),
  ).rejects.toThrowErrorMatchingInlineSnapshot(
    `[RockError: Failed to build the app with Hvigor]`,
  );

  expect(spawn).toBeCalledWith(
    'node',
    [
      expect.stringContaining('hvigorw.js'),
      '-p',
      'module=entry@default',
      '-p',
      'product=default',
      '-p',
      'buildMode=debug',
      '-p',
      'requiredDeviceType=phone',
      'assembleHap',
    ],
    { cwd: '/harmony' },
  );
});
