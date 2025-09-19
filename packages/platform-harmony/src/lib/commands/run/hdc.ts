import path from 'node:path';
import { spawn } from '@rock-js/tools';
import { getDevEcoSdkPath } from '../../paths.js';

export function getHdcPath() {
  return path.join(
    getDevEcoSdkPath(),
    'default',
    'openharmony',
    'toolchains',
    'hdc',
  );
}

/**
 * Executes the commands needed to get a list of devices from ADB
 */
export async function getDevices() {
  const hdcPath = getHdcPath();
  try {
    const { output } = await spawn(hdcPath, ['list', 'targets', '-v'], {
      stdio: 'pipe',
    });
    const lines = output.trim().split('\n');
    return lines.map((line) => {
      const parts = line.split(/\s+/);
      return {
        name: parts[0],
        method: parts[1], // USB
        state: parts[2], // Connected, Offline
        locate: parts[3], // localhost
        connectTool: parts[4],
      };
    });
  } catch {
    return [];
  }
}
