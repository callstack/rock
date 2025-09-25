import { getValidProjectConfig } from './dist/src/lib/commands/getValidProjectConfig.js';

export default {
  platforms: {
    harmony: {
      npmPackageName: '@react-native-oh/react-native-harmony',
      projectConfig: getValidProjectConfig,
      dependencyConfig: () => null,
    },
  },
};
