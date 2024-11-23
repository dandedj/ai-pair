import fs from 'fs';
import path from 'path';
import { logger } from './logger';

interface FileContent {
    path: string;
    content: string;
}

/**
 * Recursively collects all files with a given extension in specified directories.
 * @param dirs - The directories to search.
 * @param extension - The file extension to filter by.
 * @returns The collected files.
 */
function collectFilesWithExtension(dirs: string[], extension: string): FileContent[] {
    let files: FileContent[] = [];
    dirs.forEach(dir => {
        fs.readdirSync(dir).forEach(file => {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory()) {
                files = files.concat(collectFilesWithExtension([fullPath], extension));
            } else if (file.endsWith(extension)) {
                const content = fs.readFileSync(fullPath, 'utf-8');
                files.push({ path: fullPath, content });
            }
        });
    });
    return files;
}

/**
 * Collects all files with a specified extension.
 * @param dirs - The directories to search.
 * @param extension - The file extension to filter by.
 * @returns The collected files.
 */
function collectFiles(dirs: string[], extension: string): FileContent[] {
    return collectFilesWithExtension(dirs, extension);
}

/**
 * Deletes a file or directory recursively.
 * @param targetPath - The path to the file or directory.
 */
function deleteRecursive(targetPath: string): void {
    if (fs.existsSync(targetPath)) {
        const stats = fs.statSync(targetPath);
        if (stats.isDirectory()) {
            fs.readdirSync(targetPath).forEach(file => {
                const filePath = path.join(targetPath, file);
                deleteRecursive(filePath);
            });
            fs.rmdirSync(targetPath);
        } else {
            fs.unlinkSync(targetPath);
        }
    }
}

/**
 * Clears a directory by deleting all its contents.
 * @param dir - The directory to clear.
 */
function clearDirectory(dir: string): void {
    logger.debug(`Clearing directory: ${dir}`);
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(file => {
            const filePath = path.join(dir, file);
            deleteRecursive(filePath);
        });
    }
}

/**
 * Ensures that a directory exists; if not, creates it.
 * @param dir - The directory path.
 */
function ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Clears a file by truncating its contents.
 * @param filePath - The file to clear.
 */
function clearFile(filePath: string): void {
    logger.debug(`Clearing file: ${filePath}`);
    fs.writeFileSync(filePath, '');
}

export {
    collectFilesWithExtension,
    clearDirectory,
    ensureDirectoryExists,
    clearFile
}; 