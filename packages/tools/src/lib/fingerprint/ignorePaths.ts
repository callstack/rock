// export const FINGERPRINT_IGNORE_FILENAME = '.fingerprintignore'. TODO: should we include this?

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

export function getDefaultIgnorePaths() {
  return ['**/.DS_Store'];
}

export function getPlatformDirIgnorePaths(platform: string, sourceDir: string) {
  if (platform === 'android') {
    return getAndroidIgnorePaths(sourceDir);
  } else if (platform === 'ios') {
    return getIOSIgnorePaths(sourceDir);
  } else if (platform === 'harmony') {
    return getHarmonyIgnorePaths(sourceDir);
  }
  return [];
}

export function getAllIgnorePaths(platform: string, sourceDir: string) {
  return [
    ...getDefaultIgnorePaths(),
    ...getPlatformDirIgnorePaths(platform, sourceDir),
  ];
}
