import type { SubprocessError } from '@rock-js/tools';
import { logger, RockError, spawn } from '@rock-js/tools';
import { getHdcPath } from './hdc.js';

// Runs hdc rport tcp:8081 tcp:8081 to allow loading the jsbundle from the packager
export async function tryRunHdcReverse(
  packagerPort: number | string,
  device: string,
) {
  try {
    const hdcPath = getHdcPath();
    const hdcArgs = [
      '-t',
      device,
      'rport',
      `tcp:${packagerPort}`,
      `tcp:${packagerPort}`,
    ];

    logger.debug(`Connecting "${device}" to the development server`);
    await spawn(hdcPath, hdcArgs);
  } catch (error) {
    throw new RockError(
      `Failed to connect "${device}" to development server using "hdb rport"`,
      { cause: (error as SubprocessError).stderr },
    );
  }
}
