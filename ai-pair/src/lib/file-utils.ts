import fs from 'fs';
import path from 'path';
import { logger } from './logger';
import { CodeFile } from '../types/running-state';

/**
 * Clears a directory by removing and recreating it
 */
export function clearDirectory(dirPath: string): void {
    if (fs.existsSync(dirPath)) {
        fs.rmSync(dirPath, { recursive: true });
    }
    fs.mkdirSync(dirPath, { recursive: true });
}

/**
 * Collects all files with a specific extension from given directories
 */
export function collectFilesWithExtension(directories: string[], extension: string): CodeFile[] {
    const files: CodeFile[] = [];
    
    for (const directory of directories) {
        if (!fs.existsSync(directory)) {
            logger.warn(`Directory not found: ${directory}`);
            continue;
        }

        const items = fs.readdirSync(directory);
        for (const item of items) {
            const fullPath = path.join(directory, item);
            const stat = fs.statSync(fullPath);

            if (stat.isDirectory()) {
                files.push(...collectFilesWithExtension([fullPath], extension));
            } else if (item.endsWith(extension)) {
                try {
                    const content = fs.readFileSync(fullPath, 'utf-8');
                    files.push({ path: fullPath, content });
                } catch (error) {
                    const err = error as Error;
                    logger.error(`Error reading file ${fullPath}: ${err.message}`);
                }
            }
        }
    }

    return files;
}

/**
 * Checks if a file exists at the given path
 */
export function fileExists(filePath: string): boolean {
    try {
        return fs.existsSync(filePath);
    } catch (error) {
        return false;
    }
}

/**
 * Checks if a file is a build configuration file
 */
export function isBuildFile(filePath: string): boolean {
    const buildFiles = [
        'build.gradle.kts'
    ];
    const fileName = path.basename(filePath);
    return buildFiles.includes(fileName);
}

/**
 * Checks if a file is in a test directory
 */
export function isTestFile(filePath: string): boolean {
    const testDirs = ['test/', '__tests__/', 'spec/', '__mocks__/'];
    return testDirs.some(dir => filePath.includes(dir));
}

/**
 * Creates directory if it doesn't exist
 */
export function ensureDirectoryExists(filePath: string): void {
    const directory = path.dirname(filePath);
    if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
    }
}

/**
 * Safely writes content to a file, ensuring the directory exists
 */
export function safeWriteFile(filePath: string, content: string): void {
    ensureDirectoryExists(filePath);
    fs.writeFileSync(filePath, content, 'utf-8');
} 