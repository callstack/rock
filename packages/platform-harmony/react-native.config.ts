import fs from 'node:fs';
import path from 'node:path';
import { getValidProjectConfig } from './dist/src/lib/commands/getValidProjectConfig.js';

/**
 * Get the dependency config for the Harmony platform. It's currently very bare bones
 * and only supports aliasing, but that should be enough for now to list dependencies,
 * that we use as input for fingerprinting.
 * @param folder - The folder to get the dependency config for.
 * @returns The dependency config.
 */
function getDependencyConfig(folder: string) {
  const packageJsonPath = path.join(folder, 'package.json');
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    if (packageJson.harmony?.alias) {
      return { alias: packageJson.harmony.alias };
    }
  }
  return null;
}

export default {
  platforms: {
    harmony: {
      npmPackageName: '@react-native-oh/react-native-harmony',
      projectConfig: getValidProjectConfig,
      dependencyConfig: getDependencyConfig,
    },
  },
};
