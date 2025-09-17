import { vi } from 'vitest';

vi.mock('node:fs');

// Spawn mock for helpers inside @rock-js/tools that don't get mock with following mock
vi.mock('nano-spawn', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('nano-spawn')>();
  return {
    ...actual,
    default: vi.fn((file, args) => {
      const nodeChildProcess = {
        kill: vi.fn(),
        finally: vi.fn(),
      };
      if (file === 'rock' && args.includes('config')) {
        return {
          output: '{"dependencies":[]}',
          nodeChildProcess,
        };
      }
      return {
        output: '',
        nodeChildProcess,
      };
    }),
  };
});

vi.mock('@rock-js/tools', async (importOriginal) => {
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports
  const actual = await importOriginal<typeof import('@rock-js/tools')>();
  return {
    ...actual,
    // Logger
    logger: {
      ...actual.logger,
      success: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
      log: vi.fn(),
    },
    // Prompts
    intro: vi.fn(),
    outro: vi.fn(),
    note: vi.fn(),
    promptConfirm: vi.fn(),
    promptMultiSelect: vi.fn(),
    promptSelect: vi.fn(),
    promptText: vi.fn(),
    formatArtifactName: vi
      .fn()
      .mockResolvedValue(
        'rock-android-debug-089e8a9887099a309e8a7845e697bbf705353f45',
      ),
    spinner: vi.fn(() => ({
      start: vi.fn(),
      stop: vi.fn(),
      message: vi.fn(),
    })),
    // Spawn
    spawn: vi.fn(),
    getBinaryPath: vi.fn(),
  };
});
