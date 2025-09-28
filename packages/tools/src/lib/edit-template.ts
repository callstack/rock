import * as fs from 'node:fs';
import * as path from 'node:path';
import { renameFile, walkDirectory } from './fs.js';

/**
 * Placeholder name used in template, that should be replaced with normalized project name.
 */
const PLACEHOLDER_NAME = 'HelloWorld';

/**
 * Rename common files that cannot be put into template literaly, e.g. .gitignore.
 */
export function renameCommonFiles(projectPath: string) {
  const sourceGitIgnorePath = path.join(projectPath, 'gitignore');
  if (!fs.existsSync(sourceGitIgnorePath)) {
    return;
  }

  fs.renameSync(sourceGitIgnorePath, path.join(projectPath, '.gitignore'));
}

/**
 * Replace placeholder with project nae in whole template:
 * - Rename paths containing placeholder
 * - Replace placeholder in text files
 */
export function replacePlaceholder(
  projectPath: string,
  normalizedName: string,
) {
  if (normalizedName === PLACEHOLDER_NAME) {
    return;
  }

  for (const filePath of walkDirectory(projectPath).reverse()) {
    // Skip anything inside node_modules
    if (filePath.split(path.sep).includes('node_modules')) {
      continue;
    }

    if (!fs.statSync(filePath).isDirectory()) {
      replacePlaceholderInTextFile(filePath, normalizedName);
    }

    if (path.basename(filePath).includes(PLACEHOLDER_NAME)) {
      renameFile(filePath, PLACEHOLDER_NAME, normalizedName);
    } else if (
      path.basename(filePath).includes(PLACEHOLDER_NAME.toLowerCase())
    ) {
      renameFile(
        filePath,
        PLACEHOLDER_NAME.toLowerCase(),
        normalizedName.toLowerCase(),
      );
    }
  }
}

function replacePlaceholderInTextFile(
  filePath: string,
  normalizedName: string,
) {
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const replacedFileContent = fileContent
    .replaceAll(PLACEHOLDER_NAME, normalizedName)
    .replaceAll(PLACEHOLDER_NAME.toLowerCase(), normalizedName.toLowerCase());

  if (fileContent !== replacedFileContent) {
    fs.writeFileSync(filePath, replacedFileContent, 'utf8');
  }
}
