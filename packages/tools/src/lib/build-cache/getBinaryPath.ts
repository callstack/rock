import { color, colorLink } from '../color.js';
import type { RockError } from '../error.js';
import { IGNORE_PATHS } from '../fingerprint/constants.js';
import { type FingerprintSources } from '../fingerprint/index.js';
import logger from '../logger.js';
import { spawn } from '../spawn.js';
import type { RemoteBuildCache } from './common.js';
import { fetchCachedBuild } from './fetchCachedBuild.js';
import { getLocalBuildCacheBinaryPath } from './localBuildCache.js';

export async function getBinaryPath({
  artifactName,
  binaryPathFlag,
  localFlag,
  remoteCacheProvider,
  fingerprintOptions,
  sourceDir,
}: {
  artifactName: string;
  binaryPathFlag?: string;
  localFlag?: boolean;
  remoteCacheProvider: null | (() => RemoteBuildCache) | undefined;
  fingerprintOptions: FingerprintSources;
  sourceDir: string;
}) {
  // 1. First check if the binary path is provided
  let binaryPath = binaryPathFlag;

  // 2. If not, check if the local build is requested
  if (!binaryPath && !localFlag) {
    binaryPath = getLocalBuildCacheBinaryPath(artifactName);
  }

  // 3. If not, check if the remote cache is requested
  if (!binaryPath && !localFlag) {
    try {
      const cachedBuild = await fetchCachedBuild({
        artifactName,
        remoteCacheProvider,
      });
      if (cachedBuild) {
        binaryPath = cachedBuild.binaryPath;
      }
    } catch (error) {
      const message = (error as RockError).message;
      const cause = (error as RockError).cause;
      logger.warn(
        `Remote Cache: Failed to fetch cached build for ${color.bold(
          artifactName,
        )}.
Cause: ${message}${cause ? `\n${cause.toString()}` : ''}
Read more: ${colorLink(
          'https://rockjs.dev/docs/configuration#remote-cache-configuration',
        )}`,
      );
      await warnIgnoredFiles(fingerprintOptions, sourceDir);
      logger.debug('Remote cache failure error:', error);
      logger.info('Continuing with local build');
    }
  }

  return binaryPath;
}

async function warnIgnoredFiles(
  fingerprintOptions: FingerprintSources,
  sourceDir: string,
) {
  // @todo unify git helpers from create-app
  try {
    await spawn('git', ['rev-parse', '--is-inside-work-tree'], {
      stdio: 'ignore',
      cwd: sourceDir,
    });
  } catch {
    // Not a git repository, skip the git clean check
    return;
  }

  const ignorePaths = [
    ...(fingerprintOptions?.ignorePaths ?? []),
    ...IGNORE_PATHS,
  ];
  const { output } = await spawn('git', [
    'clean',
    '-fdx',
    '--dry-run',
    sourceDir,
    ...ignorePaths.flatMap((path) => ['-e', `${path}`]),
  ]);
  const ignoredFiles = output
    .split('\n')
    .map((line) => line.replace('Would remove ', ''))
    .filter((line) => line !== '');

  if (ignoredFiles.length > 0) {
    logger.warn(`There are files that likely affect fingerprint:
${ignoredFiles.map((file) => `- ${color.bold(file)}`).join('\n')}
Consider removing them or update ${color.bold(
      'fingerprint.ignorePaths',
    )} in ${colorLink('rock.config.mjs')}:
Read more: ${colorLink(
      'https://www.rockjs.dev/docs/configuration#fingerprint-configuration',
    )}`);
  }
}
