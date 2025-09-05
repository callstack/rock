// export const FINGERPRINT_IGNORE_FILENAME = '.fingerprintignore'. TODO: should we include this?

// Default list from @expo/fingerprint. https://github.com/expo/expo/blob/main/packages/%40expo/fingerprint/src/Options.ts#L15
export const DEFAULT_IGNORE_PATHS = [
  // FINGERPRINT_IGNORE_FILENAME,
  // Android
  '**/android/build/**/*',
  '**/android/.cxx/**/*',
  '**/android/.gradle/**/*',
  '**/android/app/build/**/*',
  '**/android/app/.cxx/**/*',
  '**/android/app/.gradle/**/*',
  '**/android-annotation/build/**/*',
  '**/android-annotation/.cxx/**/*',
  '**/android-annotation/.gradle/**/*',
  '**/android-annotation-processor/build/**/*',
  '**/android-annotation-processor/.cxx/**/*',
  '**/android-annotation-processor/.gradle/**/*',

  // Often has different line endings, thus we have to ignore it
  '**/android/gradlew.bat',

  // Android gradle plugins
  '**/*-gradle-plugin/build/**/*',
  '**/*-gradle-plugin/.cxx/**/*',
  '**/*-gradle-plugin/.gradle/**/*',

  // iOS
  '**/ios/Pods/**/*',
  '**/ios/build/**/*',
  '**/ios/.xcode.env.local',
  '**/ios/**/project.xcworkspace',
  '**/ios/*.xcworkspace/xcuserdata/**/*',

  // System files that differ from machine to machine
  '**/.DS_Store',

  // Ignore all expo configs because we will read expo config in a HashSourceContents already
  'app.config.ts',
  'app.config.js',
  'app.config.json',
  'app.json',

  // Ignore nested node_modules
  '**/node_modules/**/node_modules/**',

  // Ignore node binaries that might be platform dependent
  '**/node_modules/**/*.node',
  '**/node_modules/@img/sharp-*/**/*',
  '**/node_modules/sharp/{build,vendor}/**/*',
];

const ROCK_DEFAULT_IGNORE_PATHS = [
  'android/build',
  'android/**/build',
  'android/**/.cxx',
  'android/.kotlin/**',
  'ios/DerivedData',
  'ios/Pods',
  'ios/tmp.xcconfig', // added by react-native-config
  'ios/**/*.xcworkspace',
  'node_modules',
  'android/local.properties',
  'android/.idea',
  'android/.gradle',
];

export const IGNORE_PATHS = [
  ...DEFAULT_IGNORE_PATHS,
  ...ROCK_DEFAULT_IGNORE_PATHS,
];
