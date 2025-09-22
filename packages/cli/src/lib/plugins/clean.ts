import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { PluginApi, PluginOutput } from '@rock-js/config';
import {
  getProjectRoot,
  intro,
  logger,
  outro,
  promptMultiselect,
  RockError,
  spawn,
  spinner,
} from '@rock-js/tools';

type CleanOptions = {
  include?: string[];
  'verify-cache'?: boolean;
  all?: boolean;
  interactive?: boolean;
};

type CleanupTask = {
  name: string;
  description: string;
  enabled: boolean;
  action: () => Promise<void>;
};

const CLEANUP_TASK_NAMES = [
  'android',
  'gradle',
  'cocoapods',
  'metro',
  'watchman',
  'node_modules',
  'npm',
  'yarn',
  'bun',
  'pnpm',
  'rock',
  'harmony',
] as const;

/**
 * Validates that the provided task names are valid cleanup tasks.
 * @param taskNames - Array of task names to validate
 * @throws {RockError} If any task names are invalid
 */
function validateCleanupTasks(taskNames: string[]): void {
  const invalidTasks = taskNames.filter(
    (name) => !CLEANUP_TASK_NAMES.includes(name as any),
  );
  if (invalidTasks.length > 0) {
    throw new RockError(
      `Invalid cleanup task(s): ${invalidTasks.join(', ')}. ` +
        `Valid options are: ${CLEANUP_TASK_NAMES.join(', ')}`,
    );
  }
}

function removeDirectorySync(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    try {
      fs.rmSync(dirPath, { recursive: true, force: true });
      logger.debug(`Cleaned directory: ${dirPath}`);
    } catch (error) {
      logger.debug(`Failed to clean directory ${dirPath}: ${error}`);
    }
  }
}

/**
 * Checks if a project has Metro configuration.
 * @param projectRoot - The root directory of the project
 * @returns True if the project has Metro configuration, false otherwise
 */
function hasMetroProject(projectRoot: string): boolean {
  const metroConfig = path.join(projectRoot, 'metro.config.js');
  const metroConfigTs = path.join(projectRoot, 'metro.config.ts');
  const packageJsonPath = path.join(projectRoot, 'package.json');

  if (fs.existsSync(metroConfig) || fs.existsSync(metroConfigTs)) {
    return true;
  }

  if (fs.existsSync(packageJsonPath)) {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      return (
        packageJson.dependencies?.metro || packageJson.devDependencies?.metro
      );
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * Cleans temporary directories that match a given pattern.
 * @param pattern - The pattern to match temporary directory names
 */
function cleanTempDirectoryPattern(pattern: string): void {
  const tmpDir = os.tmpdir();
  try {
    const tmpDirContents = fs.readdirSync(tmpDir);
    const matchingFiles = tmpDirContents
      .filter((name) => name.startsWith(pattern))
      .map((name) => path.join(tmpDir, name));

    for (const file of matchingFiles) {
      removeDirectorySync(file);
    }
  } catch (error) {
    logger.debug(`${pattern} cache cleanup failed: ${error}`);
  }
}

/**
 * Cleans multiple directories by removing them recursively.
 * @param directories - Array of directory paths to clean
 * @param baseDir - Base directory to resolve relative paths from
 */
function cleanDirectories(directories: string[], baseDir: string): void {
  for (const dir of directories) {
    const fullPath = path.isAbsolute(dir) ? dir : path.join(baseDir, dir);
    removeDirectorySync(fullPath);
  }
}

/**
 * Creates an array of cleanup tasks for a specific project.
 * @param projectRoot - The root directory of the project
 * @param options - Clean options that affect task creation
 * @returns Array of cleanup tasks with their configurations
 */
function createCleanupTasks(
  projectRoot: string,
  options: CleanOptions,
): CleanupTask[] {
  const tasks: CleanupTask[] = [];

  // Android cleanup
  tasks.push({
    name: 'android',
    description: '[Android] Gradle build and cache (.gradle, build, .cxx)',
    enabled: true,
    action: async () => {
      const androidDir = path.join(projectRoot, 'android');
      if (fs.existsSync(androidDir)) {
        // Clean Android build directories
        const directoriesToClean = ['.gradle', 'build', '.cxx'];
        cleanDirectories(directoriesToClean, androidDir);
      }
    },
  });

  // Gradlew cleanup (separate task for slower operation)
  tasks.push({
    name: 'gradle',
    description: '[Android] gradlew clean',
    enabled: true,
    action: async () => {
      const androidDir = path.join(projectRoot, 'android');
      const gradlewPath = path.join(androidDir, 'gradlew');
      if (fs.existsSync(gradlewPath)) {
        await spawn(gradlewPath, ['clean'], { cwd: androidDir });
      }
    },
  });

  // CocoaPods cleanup
  tasks.push({
    name: 'cocoapods',
    description: '[iOS] CocoaPods cache and Pods directory',
    enabled: true,
    action: async () => {
      const iosDir = path.join(projectRoot, 'ios');
      if (fs.existsSync(iosDir)) {
        // Remove Pods directory
        cleanDirectories(['Pods'], iosDir);

        // Clean CocoaPods cache
        try {
          await spawn('bundle', ['exec', 'pod', 'cache', 'clean', '--all'], {
            cwd: iosDir,
          });
        } catch (error) {
          logger.debug(`Bundle exec pod cache clean failed: ${error}`);
          await spawn('pod', ['cache', 'clean', '--all'], { cwd: iosDir });
        }
      }

      cleanDirectories(['.cocoapods'], os.homedir());
    },
  });

  // Metro cleanup
  tasks.push({
    name: 'metro',
    description: '[JS] Metro and haste-map caches',
    enabled: true,
    action: async () => {
      cleanTempDirectoryPattern('metro-');
      cleanTempDirectoryPattern('haste-map');
    },
  });

  // Watchman cleanup (only for Metro projects)
  const hasMetro = hasMetroProject(projectRoot);
  tasks.push({
    name: 'watchman',
    description: '[JS] Watchman cache for this project',
    enabled: hasMetro,
    action: async () => {
      if (hasMetro) {
        await spawn('watchman', ['watch-del', projectRoot]);
      }
    },
  });

  // node_modules cleanup
  tasks.push({
    name: 'node_modules',
    description: '[JS] node_modules',
    enabled: true,
    action: async () => {
      cleanDirectories(['node_modules'], projectRoot);
    },
  });

  // NPM cleanup
  tasks.push({
    name: 'npm',
    description: '[JS] NPM cache ',
    enabled: options['verify-cache'] ?? false,
    action: async () => {
      await spawn('npm', ['cache', 'verify']);
    },
  });

  // Yarn cleanup
  tasks.push({
    name: 'yarn',
    description: '[JS] Yarn cache',
    enabled: true,
    action: async () => {
      await spawn('yarn', ['cache', 'clean']);
    },
  });

  // Bun cleanup
  tasks.push({
    name: 'bun',
    description: '[JS] Bun cache',
    enabled: true,
    action: async () => {
      await spawn('bun', ['pm', 'cache', 'rm']);
    },
  });

  // PNPM cleanup
  tasks.push({
    name: 'pnpm',
    description: '[JS] pnpm cache',
    enabled: true,
    action: async () => {
      await spawn('pnpm', ['store', 'prune']);
    },
  });

  // Rock cleanup
  tasks.push({
    name: 'rock',
    description: '[Rock] project cache and build artifacts (iOS/Android)',
    enabled: true,
    action: async () => {
      const rockCacheDir = path.join(projectRoot, '.rock', 'cache');

      // Clean project cache file
      const projectCacheFile = path.join(rockCacheDir, 'project.json');
      removeDirectorySync(projectCacheFile);

      // Clean remote build cache directory
      cleanDirectories(['remote-build'], rockCacheDir);

      // Clean iOS archive and export cache directory
      cleanDirectories(['ios'], rockCacheDir);

      // Clean Android build cache directory
      cleanDirectories(['android'], rockCacheDir);
    },
  });

  return tasks;
}

/**
 * Executes cleanup tasks for a specific project.
 * @param projectRoot - The root directory of the project to clean
 * @param options - Clean options that determine which tasks to run
 */
async function cleanProject(projectRoot: string, options: CleanOptions) {
  const tasks = createCleanupTasks(projectRoot, options);

  let selectedTasks: CleanupTask[];
  const availableTasks = tasks.filter((task) => task.enabled);

  if (options.include && options.include.length > 0) {
    validateCleanupTasks(options.include);
    selectedTasks = tasks.filter(
      (task) => options.include?.includes(task.name) && task.enabled,
    );
  } else if (options.all) {
    selectedTasks = availableTasks;
  } else {
    const selected = await promptMultiselect({
      message: 'Select caches to clean:',
      options: availableTasks.map((task) => ({
        value: task.name,
        label: task.description,
      })),
    });
    selectedTasks = tasks.filter((task) => selected.includes(task.name));
  }

  for (const task of selectedTasks) {
    const taskSpinner = spinner();
    taskSpinner.start(`Cleaning ${task.description}`);

    try {
      await task.action();
      taskSpinner.stop(`Success: ${task.description}`);
    } catch (error) {
      taskSpinner.stop(`Failure: ${task.description}`, 1);
      logger.debug(`Task ${task.name} failed: ${error}`);
    }
  }
}

/**
 * Main command function that handles the overall clean operation.
 * @param options - Clean options that control the cleanup behavior
 */
async function cleanCommand(options: CleanOptions) {
  intro('🧹 Rock Clean');

  const projectRoot = getProjectRoot();
  await cleanProject(projectRoot, options);
  outro('Success 🎉.');
}

export const cleanPlugin =
  () =>
  (api: PluginApi): PluginOutput => {
    api.registerCommand({
      name: 'clean',
      description: 'Clean caches and build artifacts for Rock projects',
      action: async (options: CleanOptions) => {
        await cleanCommand(options);
      },
      options: [
        {
          name: '--include <list>',
          description: `Comma-separated list of caches to clear (${CLEANUP_TASK_NAMES.join(
            ', ',
          )})`,
          parse: (val: string) => val.split(','),
        },

        {
          name: '--verify-cache',
          description:
            'Whether to verify the cache (currently only applies to npm cache)',
        },
        {
          name: '--all',
          description: 'Clean all available caches without interactive prompt',
        },
      ],
    });

    return {
      name: 'internal_clean',
      description: 'Clean plugin for Rock projects',
    };
  };
