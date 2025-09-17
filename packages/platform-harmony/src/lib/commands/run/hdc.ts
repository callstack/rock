import path from 'node:path';
import { spawn } from '@rock-js/tools';

export function getHdcPath() {
  return process.env['DEVECO_SDK_HOME']
    ? path.join(
        process.env['DEVECO_SDK_HOME'],
        'default',
        'openharmony',
        'toolchains',
        'hdc',
      )
    : 'hdc';
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
        method: parts[1],
        state: parts[2],
        locate: parts[3],
        connectTool: parts[4],
      };
    });
  } catch {
    return [];
  }
}
