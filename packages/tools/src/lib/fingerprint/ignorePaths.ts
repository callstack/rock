import { getGitIgnoredPaths } from 'fs-fingerprint';

function getAndroidIgnorePaths(sourceDir: string) {
  return [
    `${sourceDir}/app/.gradle`,
    `${sourceDir}/build`,
    `${sourceDir}/**/build`,
    `${sourceDir}/**/.cxx`,
    `${sourceDir}/.kotlin`,
    `${sourceDir}/local.properties`,
    `${sourceDir}/.idea`,
    `${sourceDir}/.gradle`,
    `${sourceDir}/gradlew.bat`, // Often has different line endings, thus we have to ignore it

    // Android annotations - revisit
    '**/android-annotation/build',
    '**/android-annotation/.cxx',
    '**/android-annotation/.gradle',
    '**/android-annotation-processor/build',
    '**/android-annotation-processor/.cxx',
    '**/android-annotation-processor/.gradle',

    // Android gradle plugins
    '**/*-gradle-plugin/build',
    '**/*-gradle-plugin/.cxx',
    '**/*-gradle-plugin/.gradle',
  ];
}

function getIOSIgnorePaths(sourceDir: string) {
  return [
    `${sourceDir}/build`,
    `${sourceDir}/.xcode.env.local`,
    `${sourceDir}/**/project.xcworkspace`,
    `${sourceDir}/*.xcworkspace/xcuserdata`,
    `${sourceDir}/DerivedData`,
    `${sourceDir}/Pods`,
    `${sourceDir}/tmp.xcconfig`, // added by react-native-config,
    `${sourceDir}/**/*.xcworkspace`,
  ];
}

function getHarmonyIgnorePaths(sourceDir: string) {
  return [
    `${sourceDir}/.hvigor`,
    `${sourceDir}/**/.idea`,
    `${sourceDir}/**/oh_modules`,
    `${sourceDir}/**/build`,
    `${sourceDir}/**/.cxx`,
    `${sourceDir}/**/.preview`,
    `${sourceDir}/**/.clangd`,
    `${sourceDir}/**/.clang-format`,
    `${sourceDir}/**/.clang-tidy`,
    `${sourceDir}/**/test`,
  ];
}

function getDefaultIgnorePaths() {
  return ['**/.DS_Store'];
}

function getPlatformDirIgnorePaths(platform: string, sourceDir: string) {
  if (platform === 'android') {
    return getAndroidIgnorePaths(sourceDir);
  } else if (platform === 'ios') {
    return getIOSIgnorePaths(sourceDir);
  } else if (platform === 'harmony') {
    return getHarmonyIgnorePaths(sourceDir);
  }
  return [];
}

/**
 * Returns all ignore paths for the given platform, source directory and project root.
 * @param platform - The platform to get the ignore paths for.
 * @param sourceDir - The relative source directory of that platform to get the ignore paths for.
 * @param projectRoot - The project root to get the ignore paths for.
 * @returns All ignore paths for the given platform, source directory and project root.
 */
export function getAllIgnorePaths(
  platform: string,
  sourceDir: string,
  projectRoot: string,
) {
  return [
    ...getDefaultIgnorePaths(),
    ...getGitIgnoredPaths(projectRoot),
    ...getPlatformDirIgnorePaths(platform, sourceDir),
  ];
}
