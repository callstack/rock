/**
 * Allow for alphanumeric, hyphen (kebab-case), and underscore (_).
 * Has to start with a letter.
 */
const NAME_REGEX = /^[A-Z][0-9A-Z_-]*$/i;

// ref: https://docs.oracle.com/javase/tutorial/java/nutsandbolts/_keywords.html
const javaKeywords = [
  'abstract',
  'continue',
  'for',
  'new',
  'switch',
  'assert',
  'default',
  'goto',
  'package',
  'synchronized',
  'boolean',
  'do',
  'if',
  'private',
  'this',
  'break',
  'double',
  'implements',
  'protected',
  'throw',
  'byte',
  'else',
  'import',
  'public',
  'throws',
  'case',
  'enum',
  'instanceof',
  'return',
  'transient',
  'catch',
  'extends',
  'int',
  'short',
  'try',
  'char',
  'final',
  'interface',
  'static',
  'void',
  'class',
  'finally',
  'long',
  'strictfp',
  'volatile',
  'const',
  'float',
  'native',
  'super',
  'while',
];

const reservedNames = ['react', 'react-native', ...javaKeywords];

export function validateProjectName(name: string) {
  if (name.length === 0) {
    return 'Project name cannot be empty.';
  }

  if (!name.match(NAME_REGEX)) {
    return `Invalid project name: "${name}". Please use a valid identifier name (alphanumeric, hyphen, underscore).`;
  }

  const lowerCaseName = name.toLowerCase();
  if (reservedNames.includes(lowerCaseName)) {
    return `Invalid project name: "${name}". Can't use reserved name. Please use another name.`;
  }

  return undefined;
}

/**
 * Transform project name to PascalCase. The input name can be in either kebab-case or PascalCase.
 *
 * @param name - Project name
 * @returns PascalCase project name
 */
export function normalizeProjectName(name: string) {
  if (!name) return '';

  return name
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}
