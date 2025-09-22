import * as path from 'node:path';
import {
  resolveAbsolutePath,
  type SupportedRemoteCacheProviders,
} from '@rock-js/tools';

export type TemplateInfo = NpmTemplateInfo | LocalTemplateInfo;

export type NpmTemplateInfo = {
  type: 'npm';
  name: string;
  version: string;
  packageName: string;
  /** Directory inside package that contains the template */
  directory: string | undefined;
  importName?: string;
  hint?: string;
};

export type LocalTemplateInfo = {
  type: 'local';
  name: string;
  localPath: string;
  packageName: string;
  directory: string | undefined;
  importName?: string;
  hint?: string;
};

export const TEMPLATES: TemplateInfo[] = [
  {
    type: 'npm',
    name: 'default',
    packageName: '@rock-js/template-default',
    version: 'latest',
    directory: '.',
  },
];

export const PLUGINS: TemplateInfo[] = [
  {
    type: 'npm',
    name: 'brownfield-ios',
    packageName: '@rock-js/plugin-brownfield-ios',
    hint: 'Setup packaging React Native app as a XCFramework',
    version: 'latest',
    directory: 'template',
    importName: 'pluginBrownfieldIos',
  },
  {
    type: 'npm',
    name: 'brownfield-android',
    packageName: '@rock-js/plugin-brownfield-android',
    hint: 'Setup packaging React Native app as an AAR',
    version: 'latest',
    directory: 'template',
    importName: 'pluginBrownfieldAndroid',
  },
];

export const BUNDLERS: TemplateInfo[] = [
  {
    type: 'npm',
    name: 'metro',
    packageName: '@rock-js/plugin-metro',
    version: 'latest',
    directory: 'template',
    importName: 'pluginMetro',
  },
  {
    type: 'npm',
    name: 'repack',
    packageName: '@rock-js/plugin-repack',
    version: 'latest',
    directory: 'template',
    importName: 'pluginRepack',
  },
];

export const PLATFORMS: TemplateInfo[] = [
  {
    type: 'npm',
    name: 'ios',
    packageName: '@rock-js/platform-ios',
    version: 'latest',
    directory: 'template',
    importName: 'platformIOS',
  },
  {
    type: 'npm',
    name: 'android',
    packageName: '@rock-js/platform-android',
    version: 'latest',
    directory: 'template',
    importName: 'platformAndroid',
  },
  {
    type: 'npm',
    name: 'harmony',
    packageName: '@rock-js/platform-harmony',
    version: 'latest',
    directory: 'template',
    importName: 'platformHarmony',
  },
];

export function remoteCacheProviderToImportTemplate(
  provider: SupportedRemoteCacheProviders,
) {
  switch (provider) {
    case 'github-actions':
      return `import { providerGitHub } from '@rock-js/provider-github';`;
    case 's3':
      return `import { providerS3 } from '@rock-js/provider-s3';`;
  }
}

export function remoteCacheProviderToConfigTemplate(
  provider: SupportedRemoteCacheProviders,
  args: Record<string, string>,
) {
  switch (provider) {
    case 'github-actions':
      return template([
        'remoteCacheProvider: providerGitHub({',
        `  owner: '${args['owner']}',`,
        `  repository: '${args['repository']}',`,
        '}),',
      ]);
    case 's3':
      return template([
        'remoteCacheProvider: providerS3({',
        `  bucket: '${args['bucket']}',`,
        `  region: '${args['region']}',`,
        [`  endpoint: '${args['endpoint']}',`, Boolean(args['endpoint'])],
        '}),',
      ]);
  }
}

export function template(lines: Array<string | [string, boolean]>) {
  return lines
    .filter((line) => {
      // If it's a [content, condition] pair, check the condition
      if (Array.isArray(line)) {
        return Boolean(line[1]);
      }
      // If it's just a string, always include it
      return true;
    })
    .map((line) => {
      // Extract content from [content, condition] pair or use string directly
      const content = Array.isArray(line) ? line[0] : line;
      return content;
    })
    .join('\n  ');
}

export function resolveTemplate(
  templates: TemplateInfo[],
  name: string,
): TemplateInfo {
  // Check if the template is a template from the list
  const templateFromList = templates.find((t) => t.name === name);
  if (templateFromList) {
    return templateFromList;
  }

  // Check filesystem paths: both folders and .tgz
  if (
    name.startsWith('./') ||
    name.startsWith('../') ||
    name.startsWith('/') ||
    name.startsWith('file:///')
  ) {
    if (name.startsWith('file://')) {
      name = name.slice(7);
    }

    const basename = path.basename(name);
    const ext = path.extname(basename);

    return {
      type: 'local',
      name: basename.slice(0, basename.length - ext.length),
      localPath: resolveAbsolutePath(name),
      directory: '.',
      packageName: basename.slice(0, basename.length - ext.length),
    };
  }

  // @todo: handle cases when template is github repo url

  // Otherwise, assume it's a npm package
  return {
    type: 'npm',
    name: getNpmLibraryName(name),
    packageName: getNpmLibraryName(name),
    directory: '.',
    version: getNpmLibraryVersion(name) ?? 'latest',
  };
}

// handles `package@x.y.z` and `@scoped/package@x.y.z` package naming schemes
function getNpmLibraryVersion(name: string) {
  const splitName = name.split('@');
  if (splitName.length === 3 && splitName[0] === '') {
    return splitName[2];
  } else if (splitName.length === 2 && splitName[0] !== '') {
    return splitName[1];
  }
  return null;
}

// handles `package@x.y.z` and `@scoped/package@x.y.z` package naming schemes
function getNpmLibraryName(name: string) {
  const splitName = name.split('@');
  if (splitName.length === 3 && splitName[0] === '') {
    return `@${splitName[1]}`;
  } else if (splitName.length === 2 && splitName[0] !== '') {
    return splitName[0];
  }
  return name;
}
