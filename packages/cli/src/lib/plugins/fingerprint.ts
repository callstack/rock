import { performance } from 'node:perf_hooks';
import type { PluginApi } from '@rock-js/config';
import type { FingerprintSources } from '@rock-js/tools';
import {
  color,
  intro,
  isInteractive,
  logger,
  nativeFingerprint,
  outro,
  RockError,
  spinner,
} from '@rock-js/tools';

type NativeFingerprintCommandOptions = {
  platform: 'ios' | 'android';
  raw?: boolean;
  debug?: boolean;
};

export async function nativeFingerprintCommand(
  path: string,
  { extraSources, ignorePaths, env }: FingerprintSources,
  options: NativeFingerprintCommandOptions,
) {
  validateOptions(options);
  const platform = options.platform;
  const readablePlatformName = platform === 'ios' ? 'iOS' : 'Android';

  if (options.raw || !isInteractive()) {
    const fingerprint = await nativeFingerprint(path, {
      platform,
      extraSources,
      ignorePaths,
      env,
    });
    console.log(fingerprint.hash);
    if (options.debug) {
      // log sources to stderr to avoid polluting the standard output
      console.error(
        JSON.stringify(
          {
            hash: fingerprint.hash,
            sources: fingerprint.inputs.filter((source) => source.hash != null),
          },
          null,
          2,
        ),
      );
    }
    return;
  }

  intro(`${readablePlatformName} Fingerprint`);

  const loader = spinner();
  loader.start("Calculating fingerprint for the project's native parts");

  const start = performance.now();
  const fingerprint = await nativeFingerprint(path, {
    platform,
    extraSources,
    ignorePaths,
    env,
  });
  const duration = performance.now() - start;

  loader.stop(
    `Fingerprint calculated: ${color.bold(color.magenta(fingerprint.hash))}`,
  );

  logger.debug(
    'Sources:',
    JSON.stringify(
      fingerprint.inputs.filter((source) => source.hash != null),
      null,
      2,
    ),
  );
  logger.debug(`Duration: ${(duration / 1000).toFixed(1)}s`);

  outro('Success 🎉.');
}

function validateOptions(options: NativeFingerprintCommandOptions) {
  if (!options.platform) {
    throw new RockError(
      'The --platform flag is required. Please specify either "ios" or "android".',
    );
  }
  if (options.platform !== 'ios' && options.platform !== 'android') {
    throw new RockError(
      `Unsupported platform "${options.platform}". Please specify either "ios" or "android".`,
    );
  }
}

export const fingerprintPlugin = () => (api: PluginApi) => {
  api.registerCommand({
    name: 'fingerprint',
    description: 'Calculate fingerprint for given platform',
    action: async (path, options) => {
      const fingerprintOptions = api.getFingerprintOptions();
      const dir = path || api.getProjectRoot();
      await nativeFingerprintCommand(dir, fingerprintOptions, options);
    },
    options: [
      {
        name: '-p, --platform <string>',
        description: 'Select platform, e.g. ios or android',
      },
      {
        name: '--raw',
        description: 'Output the raw fingerprint hash for piping',
      },
      {
        name: '--debug',
        description: 'Output additional debugging information',
      },
    ],
    args: [
      { name: '[path]', description: 'Directory to calculate fingerprint for' },
    ],
  });

  return {
    name: 'internal_fingerprint',
    description: 'Fingerprint plugin',
  };
};
