import * as fs from 'node:fs';
import * as path from 'node:path';

export function mergePackageJsons(from: string, to: string) {
  const src = JSON.parse(fs.readFileSync(from, 'utf-8'));
  if (!fs.existsSync(to)) {
    fs.copyFileSync(from, to);
  }

  const dist = JSON.parse(fs.readFileSync(to, 'utf-8'));

  // @todo consider adding a warning when src keys are different from dist keys
  dist.scripts = { ...dist.scripts, ...src.scripts };
  dist.dependencies = { ...dist.dependencies, ...src.dependencies };
  dist.devDependencies = { ...dist.devDependencies, ...src.devDependencies };
  dist.peerDependencies = { ...dist.peerDependencies, ...src.peerDependencies };
  fs.writeFileSync(to, JSON.stringify(dist, null, 2));
}

export function rewritePackageJson(projectPath: string, packageName: string) {
  const packageJsonPath = path.join(projectPath, 'package.json');
  if (!fs.existsSync(packageJsonPath)) {
    return;
  }

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));

  // Override fields from template
  packageJson.name = packageName;
  packageJson.version = '1.0.0';
  packageJson.private = true;

  delete packageJson.publishConfig;

  if (packageJson.dependencies) {
    packageJson.dependencies = Object.fromEntries(
      Object.entries(packageJson.dependencies).sort(),
    );
  }

  if (packageJson.devDependencies) {
    packageJson.devDependencies = Object.fromEntries(
      Object.entries(packageJson.devDependencies).sort(),
    );
  }
  if (packageJson.peerDependencies) {
    packageJson.peerDependencies = Object.fromEntries(
      Object.entries(packageJson.peerDependencies).sort(),
    );
  }

  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(sortPackageJson(packageJson), null, 2),
  );
}

/**
 * Sort fields in package.json to make it cleaner.
 * @param packageJson
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sortPackageJson(packageJson: any) {
  const {
    name,
    version,
    private: privateValue,
    scripts,
    dependencies,
    devDependencies,
    peerDependencies,
    ...rest
  } = packageJson;

  const result: Record<string, unknown> = {};
  setField(result, 'name', name);
  setField(result, 'version', version);
  setField(result, 'private', privateValue);
  setField(result, 'scripts', scripts);
  setField(result, 'dependencies', dependencies);
  setField(result, 'devDependencies', devDependencies);
  setField(result, 'peerDependencies', peerDependencies);

  for (const key in rest) {
    result[key] = rest[key];
  }

  return result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setField(packageJson: any, key: string, value: unknown) {
  if (value !== undefined) {
    packageJson[key] = value;
  }
}
