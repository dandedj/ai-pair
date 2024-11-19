const fs = require('fs');
const path = require('path');
const { logger } = require('./logger');

/**
 * Recursively collects all files with a given extension in specified directories.
 * @param {string[]} dirs - The directories to search.
 * @param {string} extension - The file extension to filter by.
 * @returns {Array<{ path: string, content: string }>} - The collected files.
 */
function collectFilesWithExtension(dirs, extension) {
    let files = [];
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
 * Collects all Java files and their contents.
 * @param {string[]} dirs - The directories to search.
 * @returns {Array<{ path: string, content: string }>} - The collected Java files.
 */
function collectFiles(dirs, extension) {
    return collectFilesWithExtension(dirs, extension);
}

/**
 * Deletes a file or directory recursively.
 * @param {string} targetPath - The path to the file or directory.
 */
function deleteRecursive(targetPath) {
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
 * @param {string} dir - The directory to clear.
 */
function clearDirectory(dir) {
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
 * @param {string} dir - The directory path.
 */
function ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

/**
 * Clears a file by truncating its contents.
 * @param {string} filePath - The file to clear.
 */
function clearFile(filePath) {
    logger.debug(`Clearing file: ${filePath}`);
    fs.writeFileSync(filePath, '');
}

module.exports = {
    collectFilesWithExtension,
    clearDirectory,
    ensureDirectoryExists,
    clearFile
};