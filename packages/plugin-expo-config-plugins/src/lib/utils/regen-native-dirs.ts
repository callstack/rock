import * as path from 'node:path';
import type { PluginApi } from '@rock-js/config';
import {
  copyDirSync,
  normalizeProjectName,
  replacePlaceholder,
} from '@rock-js/tools';

export async function regenNativeDirs(api: PluginApi) {
  const projectRoot = api.getProjectRoot();

  const iosTemplatePath = path.join(
    projectRoot,
    'node_modules',
    '@rock-js',
    'platform-ios',
    'template',
    'ios',
  );

  copyDirSync(iosTemplatePath, path.join(projectRoot, 'ios'));

  const androidTemplatePath = path.join(
    projectRoot,
    'node_modules',
    '@rock-js',
    'platform-android',
    'template',
    'android',
  );

  copyDirSync(androidTemplatePath, path.join(projectRoot, 'android'));

  replacePlaceholder(
    projectRoot,
    normalizeProjectName(path.basename(projectRoot)),
  );
}
