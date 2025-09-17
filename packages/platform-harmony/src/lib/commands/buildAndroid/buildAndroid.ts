import type { AndroidProjectConfig } from '@react-native-community/cli-types';
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
import { runGradle } from '../runGradle.js';
import { toPascalCase } from '../toPascalCase.js';

export interface BuildFlags {
  variant: string;
  aab?: boolean;
  activeArchOnly?: boolean;
  tasks?: Array<string>;
  extraParams?: Array<string>;
  local?: boolean;
}

export async function buildAndroid(
  androidProject: AndroidProjectConfig,
  args: BuildFlags,
  projectRoot: string,
  remoteCacheProvider: null | (() => RemoteBuildCache) | undefined,
  fingerprintOptions: FingerprintSources,
) {
  normalizeArgs(args);
  // Use assemble task by default, but bundle if the flag is set
  const buildTaskBase = args.aab ? 'bundle' : 'assemble';
  const tasks = args.tasks ?? [`${buildTaskBase}${toPascalCase(args.variant)}`];
  const artifactName = await formatArtifactName({
    platform: 'android',
    traits: [args.variant],
    root: projectRoot,
    fingerprintOptions,
  });
  const binaryPath = await getBinaryPath({
    platformName: 'android',
    artifactName,
    localFlag: args.local,
    remoteCacheProvider,
    fingerprintOptions,
    sourceDir: androidProject.sourceDir,
  });
  if (!binaryPath) {
    await runGradle({ tasks, androidProject, args, artifactName });
  }

  const outputFilePath =
    binaryPath ?? (await findOutputFile(androidProject, tasks));

  if (outputFilePath) {
    logger.log(
      `Build available at: ${colorLink(relativeToCwd(outputFilePath))}`,
    );
  }
  outro('Success 🎉.');
}

function normalizeArgs(args: BuildFlags) {
  if (args.tasks && args.variant) {
    logger.warn(
      'Both "--tasks" and "--variant" parameters were passed. Using "--tasks" for building the app.',
    );
  }
  if (!args.variant) {
    args.variant = 'debug';
  }
}

export const options = [
  {
    name: '--variant <string>',
    description: `Specify your app's build variant, which is constructed from build type and product flavor, e.g. "debug" or "freeRelease".`,
  },
  {
    name: '--aab',
    description:
      'Produces an Android App Bundle (AAB) suited for app stores such as Google Play. If not set, APK is created.',
  },
  {
    name: '--tasks <list>',
    description:
      'Run custom Gradle tasks. Will override the "--variant" and "--bundle" arguments.',
    parse: (val: string) => val.split(','),
  },
  {
    name: '--active-arch-only',
    description:
      'Build native libraries only for the current device architecture. Set by default in debug builds and interactive environments.',
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
];
