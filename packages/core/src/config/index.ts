import * as fs from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Load YAML content from a file path.
 * Uses a minimal YAML parser to avoid heavy dependencies.
 * For production, consider `js-yaml`.
 */
async function loadYaml(filePath: string): Promise<Record<string, unknown>> {
  const content = await fs.readFile(filePath, 'utf-8');
  return parseYaml(content);
}

/**
 * Minimal YAML parser supporting key-value pairs, nested objects, and arrays.
 * For complex YAML, use `js-yaml`.
 */
function parseYaml(content: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = content.split('\n');
  let currentTopKey = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    // Top-level key (no indentation)
    if (!line.startsWith(' ') && !line.startsWith('\t')) {
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      const key = trimmed.slice(0, colonIndex).trim();
      const value = trimmed.slice(colonIndex + 1).trim();
      currentTopKey = key;

      if (value === '' || value === '{}' || value === 'null') {
        result[key] = {};
      } else {
        result[key] = parseYamlValue(value);
      }
    } else {
      // Nested key-value under currentTopKey
      const colonIndex = trimmed.indexOf(':');
      if (colonIndex === -1) continue;
      const key = trimmed.slice(0, colonIndex).trim().replace(/^- /, '');
      const value = trimmed.slice(colonIndex + 1).trim();

      if (!result[currentTopKey] || typeof result[currentTopKey] !== 'object') {
        result[currentTopKey] = {};
      }
      (result[currentTopKey] as Record<string, unknown>)[key] = parseYamlValue(value);
    }
  }

  return result;
}

function parseYamlValue(value: string): unknown {
  if (!value || value === 'null' || value === '~') return null;
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (/^-?\d+$/.test(value)) return parseInt(value, 10);
  if (/^-?\d+\.\d+$/.test(value)) return parseFloat(value);
  // Strip quotes
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

/**
 * Deep merge two objects.
 * Source properties override target.
 */
function deepMerge<T extends Record<string, unknown>>(
  target: T,
  source: Partial<T>,
): T {
  const result = { ...target };

  for (const key of Object.keys(source)) {
    const sourceValue = source[key];
    const targetValue = result[key];

    if (
      sourceValue &&
      typeof sourceValue === 'object' &&
      !Array.isArray(sourceValue) &&
      targetValue &&
      typeof targetValue === 'object' &&
      !Array.isArray(targetValue)
    ) {
      result[key] = deepMerge(
        targetValue as Record<string, unknown>,
        sourceValue as Record<string, unknown>,
      ) as T[Extract<keyof T, string>];
    } else if (sourceValue !== null && sourceValue !== '') {
      result[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Configuration manager.
 *
 * Loads config from YAML files and merges with CLI parameters.
 * Priority: CLI params > custom config > app-level config.
 */
export class ConfigManager {
  private config: Record<string, unknown> = {};
  private configPath: string | null = null;

  constructor(configPath?: string) {
    if (configPath) {
      this.configPath = configPath;
    }
  }

  /**
   * Load configuration from a YAML file.
   */
  async load(filePath: string): Promise<void> {
    this.configPath = filePath;
    this.config = await loadYaml(filePath);
  }

  /**
   * Get configuration for a specific app.
   */
  getAppConfig<T = Record<string, unknown>>(appName: string): T {
    return (this.config[appName] ?? {}) as T;
  }

  /**
   * Get the full configuration.
   */
  getAll(): Record<string, unknown> {
    return { ...this.config };
  }

  /**
   * Merge CLI parameters into the app config.
   * CLI params have the highest priority.
   */
  mergeAppConfig(appName: string, params: Record<string, unknown>): void {
    const currentAppConfig = this.getAppConfig(appName);
    const merged = deepMerge(currentAppConfig, params);
    this.config[appName] = merged;
  }

  /**
   * Save current config to a YAML file.
   */
  async save(filePath?: string): Promise<void> {
    const targetPath = filePath ?? this.configPath;
    if (!targetPath) {
      throw new Error('No config file path specified');
    }

    const content = this.toYaml(this.config);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, content, 'utf-8');
  }

  /**
   * Simple YAML serializer.
   * For production, consider `js-yaml`.
   */
  private toYaml(obj: Record<string, unknown>, indent = 0): string {
    const lines: string[] = [];
    const prefix = '  '.repeat(indent);

    for (const [key, value] of Object.entries(obj)) {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        lines.push(`${prefix}${key}:`);
        lines.push(this.toYaml(value as Record<string, unknown>, indent + 1));
      } else if (value === null) {
        lines.push(`${prefix}${key}: null`);
      } else if (typeof value === 'string') {
        lines.push(`${prefix}${key}: "${value}"`);
      } else {
        lines.push(`${prefix}${key}: ${value}`);
      }
    }

    return lines.join('\n');
  }
}
