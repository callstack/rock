import fs from 'node:fs';
import path from 'node:path';
import nodePath from 'node:path';
import { mergePackageJsons } from './package-json.js';

export function isEmptyDirSync(path: string) {
  const files = fs.readdirSync(path);
  return files.length === 0 || (files.length === 1 && files[0] === '.git');
}

type CopyDirOptions = {
  skipFiles?: string[];
};

export function copyDirSync(
  from: string,
  to: string,
  { skipFiles = [] }: CopyDirOptions = {},
) {
  fs.mkdirSync(to, { recursive: true });

  for (const file of fs.readdirSync(from)) {
    const srcFile = nodePath.resolve(from, file);
    const stat = fs.statSync(srcFile);
    const distFile = nodePath.resolve(to, file);

    if (stat.isDirectory()) {
      copyDirSync(srcFile, distFile, { skipFiles });
    } else {
      if (nodePath.basename(srcFile) === 'package.json') {
        mergePackageJsons(srcFile, distFile);
      } else if (!skipFiles?.includes(nodePath.basename(srcFile))) {
        fs.copyFileSync(srcFile, distFile);
      }
    }
  }
}

export function removeDirSync(path: string) {
  if (fs.existsSync(path)) {
    fs.rmSync(path, { recursive: true });
  }
}

export function walkDirectory(currentPath: string): string[] {
  if (!fs.lstatSync(currentPath).isDirectory()) {
    return [currentPath];
  }

  const childPaths = fs
    .readdirSync(currentPath)
    .flatMap((childName) => walkDirectory(path.join(currentPath, childName)));
  return [currentPath, ...childPaths];
}

export function renameFile(filePath: string, oldName: string, newName: string) {
  const newFileName = nodePath.join(
    nodePath.dirname(filePath),
    nodePath.basename(filePath).replaceAll(oldName, newName),
  );

  fs.renameSync(filePath, newFileName);
}

export function getNameWithoutExtension(filePath: string) {
  return path.basename(filePath, path.extname(filePath));
}
