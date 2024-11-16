const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { ensureDirectoryExists } = require('./FileUtils');
const { getLogger } = require('./logger');

const logger = getLogger();

/**
 * Parses and applies generated code from the AI client.
 * @param {string} rootDir - The root directory of the project.
 * @param {string} tmpDir - The temporary directory for intermediate files.
 * @param {string} extension - The file extension to process.
 * @param {string} generatedCode - The generated code from the AI.
 * @returns {Object} - Details about the changes made.
 */
function parseAndApplyGeneratedCode(rootDir, tmpDir, extension, generatedCode) {
    logger.debug(`Parsing and applying generated code from ${rootDir}, ${tmpDir}, ${extension}`);
    const codeBlocks = extractCodeBlocks(generatedCode);

    logger.debug(`Found ${codeBlocks.length} code blocks in the generated code.`);

    if (codeBlocks.length === 0) {
        logger.info('No code changes recommended by AI');
        return {
            filesChanged: 0,
            filesAdded: 0,
            meaningfulChanges: 0,
            changedFiles: [],
            newFiles: [],
        };
    }

    let filesChanged = 0;
    let filesAdded = 0;
    let meaningfulChanges = 0;
    const changedFiles = [];
    const newFiles = [];

    codeBlocks.forEach(({ filePath, code }) => {
        const fullPath = path.join(rootDir, filePath);
        const tempFilePath = path.join(tmpDir, filePath);

        ensureDirectoryExists(path.dirname(tempFilePath));
        ensureDirectoryExists(path.dirname(fullPath));

        fs.writeFileSync(tempFilePath, code);

        const isTestFileFlag = isTestFile(filePath);

        if (isTestFileFlag) {
            logger.warn(`Attempted to modify a test file: ${filePath}. Changes will not be applied.`);
            return;
        }

        const isNewFile = !fs.existsSync(fullPath);
        const isSrcFile = filePath.endsWith(extension);

        if (isNewFile) {
            logger.debug(`New file will be added: ${filePath}`);
            filesAdded++;
            newFiles.push(filePath);
        } else if (!isSrcFile) {
            logger.warn(`A non-source file will be changed: ${filePath}`);
        } else {
            // Archive the original file
            archiveOriginalFile(fullPath, tmpDir, filePath);
            filesChanged++;
            changedFiles.push(filePath);
        }

        fs.writeFileSync(fullPath, code);
        fs.unlinkSync(tempFilePath);
        meaningfulChanges++;
    });

    logger.info(`Summary: ${filesChanged} source files changed, ${filesAdded} files added, ${meaningfulChanges} meaningful changes.`);
    return {
        filesChanged,
        filesAdded,
        meaningfulChanges,
        changedFiles,
        newFiles,
    };
}

/**
 * Extracts code blocks from the AI-generated code.
 * @param {string} generatedCode - The generated code from the AI.
 * @returns {Array} - An array of code block objects with file paths and code.
 */
function extractCodeBlocks(generatedCode) {
    const codeBlocks = [];
    const codeBlockRegex = /```(?:\w+)?:(.+?)\n([\s\S]*?)```/g;
    let match;

    while ((match = codeBlockRegex.exec(generatedCode)) !== null) {
        const filePath = match[1].trim();
        const code = match[2].trim();
        if (code) {
            codeBlocks.push({ filePath, code });
        }
    }
    return codeBlocks;
}

/**
 * Archives the original file before changes.
 * @param {string} fullPath - The full path to the original file.
 * @param {string} tmpDir - The temporary directory for storing archives.
 * @param {string} filePath - The relative file path.
 */
function archiveOriginalFile(fullPath, tmpDir, filePath) {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const archiveDir = path.join(tmpDir, 'archive', 'versions', path.dirname(filePath));
    ensureDirectoryExists(archiveDir);
    const archivePath = path.join(archiveDir, `${path.basename(filePath, '.java')}_${timestamp}.java`);
    fs.copyFileSync(fullPath, archivePath);
}

/**
 * Checks if a file is a test file based on its path.
 * @param {string} filePath - The file path to check.
 * @returns {boolean} - True if it's a test file; otherwise, false.
 */
function isTestFile(filePath) {
    return filePath.includes('/test/');
}

module.exports = { parseAndApplyGeneratedCode }; 