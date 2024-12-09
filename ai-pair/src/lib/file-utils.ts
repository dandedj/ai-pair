import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger';
import { CodeFile } from '../types/running-state';
import { existsSync, mkdirSync } from 'fs';

/**
 * Clears a directory by removing it and recreating it.
 */
export async function clearDirectory(dirPath: string): Promise<void> {
    try {
        await fs.rm(dirPath, { recursive: true, force: true });
        await fs.mkdir(dirPath, { recursive: true });
    } catch (err) {
        logger.error(`Failed to clear directory '${dirPath}': ${(err as Error).message}`);
    }
}

/**
 * Collects all files with a specific extension from the given directories.
 */
export async function collectFilesWithExtension(
    directories: string[],
    extension: string
): Promise<CodeFile[]> {
    const files: CodeFile[] = [];

    for (const directory of directories) {
        let items: string[];
        try {
            items = await fs.readdir(directory);
        } catch {
            logger.warn(`Directory not found: '${directory}'`);
            continue;
        }

        for (const item of items) {
            const fullPath = path.join(directory, item);
            try {
                const stat = await fs.stat(fullPath);

                if (stat.isDirectory()) {
                    files.push(...(await collectFilesWithExtension([fullPath], extension)));
                } else if (item.endsWith(extension)) {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    files.push({ path: fullPath, content });
                }
            } catch (err) {
                logger.error(`Error reading file '${fullPath}': ${(err as Error).message}`);
            }
        }
    }

    return files;
}

/**
 * Checks if a file exists at the given path.
 */
export function fileExists(filePath: string): boolean {
    try {
        return existsSync(filePath);
    } catch {
        return false;
    }
}

/**
 * Checks if a file is a recognized build configuration file.
 */
export function isBuildFile(filePath: string): boolean {
    const buildFiles = ['build.gradle.kts', 'build.gradle', 'pom.xml'];
    const fileName = path.basename(filePath);
    return buildFiles.includes(fileName);
}

/**
 * Checks if a file resides in a test directory.
 */
export function isTestFile(filePath: string): boolean {
    const testDirs = ['test/', '__tests__/', 'spec/', '__mocks__/'];
    return testDirs.some((dir) => filePath.includes(dir));
}

/**
 * Ensures the directory for the given file path exists.
 */
export function ensureDirectoryExists(filePath: string): void {
    const directory = path.dirname(filePath);
    if (!existsSync(directory)) {
        mkdirSync(directory, { recursive: true });
    }
}

/**
 * Writes content to a file safely by ensuring the directory exists.
 */
export async function safeWriteFile(filePath: string, content: string): Promise<void> {
    const directory = path.dirname(filePath);
    try {
        await fs.mkdir(directory, { recursive: true });
        await fs.writeFile(filePath, content, 'utf-8');
    } catch (err) {
        logger.error(`Failed to write to file '${filePath}': ${(err as Error).message}`);
    }
}

/**
 * Resolves a base path with an optional relative path.
 */
export function resolvePath(basePath: string, relativePath?: string): string {
    return path.resolve(basePath, relativePath || '');
}

/**
 * Joins multiple path segments into a single path.
 */
export function joinPaths(...paths: string[]): string {
    return path.join(...paths);
}

/**
 * Resolves project paths such as source and test directories.
 */
export function resolveProjectPaths(config: {
    projectRoot: string;
    srcDir?: string;
    testDir?: string;
}) {
    return {
        projectRoot: resolvePath(config.projectRoot),
        srcDir: resolvePath(config.projectRoot, config.srcDir || 'src/main/java'),
        testDir: resolvePath(config.projectRoot, config.testDir || 'src/test')
    };
}