import type { RemoteBuildCache } from '@rock-js/tools';
import {
  colorLink,
  type FingerprintSources,
  formatArtifactName,
  getBinaryPath,
  logger,
  outro,
  parseArgs,
  relativeToCwd,
} from '@rock-js/tools';
import { findOutputFile } from '../run/findOutputFile.js';
import { runHvigor } from '../runHvigor.js';

export interface BuildFlags {
  tasks?: Array<string>;
  buildMode: string;
  module: string;
  product: string;
  extraParams?: Array<string>;
  local?: boolean;
}

export async function buildHarmony(
  harmonyConfig: {
    sourceDir: string;
    bundleName: string;
  },
  args: BuildFlags,
  projectRoot: string,
  remoteCacheProvider: null | (() => RemoteBuildCache) | undefined,
  fingerprintOptions: FingerprintSources,
) {
  normalizeArgs(args);
  const { sourceDir, bundleName } = harmonyConfig;
  const artifactName = await formatArtifactName({
    platform: 'harmony',
    traits: [args.buildMode],
    root: projectRoot,
    fingerprintOptions,
  });
  const binaryPath = await getBinaryPath({
    platformName: 'harmony',
    artifactName,
    localFlag: args.local,
    remoteCacheProvider,
    fingerprintOptions,
    sourceDir,
  });
  if (!binaryPath) {
    // @todo revisit
    await runHvigor({ sourceDir, args, artifactName, bundleName });
  }

  const outputFilePath =
    binaryPath ?? (await findOutputFile(sourceDir, args.module));

  if (outputFilePath) {
    logger.log(
      `Build available at: ${colorLink(relativeToCwd(outputFilePath))}`,
    );
  }
  outro('Success 🎉.');
}

function normalizeArgs(args: BuildFlags) {
  if (args.tasks && args.buildMode) {
    logger.warn(
      'Both "--tasks" and "--build-mode" parameters were passed. Using "--tasks" for building the app.',
    );
  }
  if (!args.buildMode) {
    args.buildMode = 'debug';
  }
}

export const options = [
  {
    name: '--variant <string>',
    description: `Specify your app's build variant, which is constructed from build type and product flavor, e.g. "debug" or "freeRelease".`,
  },
  {
    name: '--extra-params <string>',
    description: 'Custom params passed to gradle build command',
    parse: parseArgs,
  },
  {
    name: '--local',
    description: 'Force local build with Gradle wrapper.',
  },
  {
    name: '--module <string>',
    description: 'Name of the OH module to run.',
    default: 'entry',
  },
  {
    name: '--build-mode <string>',
    description: `Specify your app's build mode, e.g. "debug" or "release".`,
    default: 'debug',
  },
  {
    name: '--product <string>',
    description: 'OpenHarmony product defined in build-profile.json5.',
    default: 'default',
  },
];
