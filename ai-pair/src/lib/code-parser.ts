import path from 'path';
import fs from 'fs';
import { Config } from 'ai-pair-types';
import { RunningState, CodeChangeSummary } from 'ai-pair-types';
import { logger } from './logger';
import { fileExists, isBuildFile, isTestFile, safeWriteFile } from './file-utils';

interface FileBlock {
    filePath: string;
    content: string;
}

/**
 * Parses the generated code and applies changes to the project.
 */
export function parseAndApplyGeneratedCode(
    config: Config,
    runningState: RunningState,
    generatedCode: string
): CodeChangeSummary {
    const codeChanges: CodeChangeSummary = initializeCodeChangeSummary();
    const fileBlocks = extractFileBlocks(generatedCode);

    if (fileBlocks.length === 0) {
        logger.warn('No valid code blocks found in the generated code.');
        return codeChanges;
    }

    const changesDir = prepareChangesDirectory(config.tmpDir, runningState.generationCycleDetails.length);

    fileBlocks.forEach((block) => processFileBlock(block, config, changesDir, codeChanges));

    logCodeChanges(codeChanges);
    return codeChanges;
}

/**
 * Extracts individual file blocks from the generated code.
 */
export function extractFileBlocks(generatedCode: string): FileBlock[] {
    const fileBlocks: FileBlock[] = [];
    const blocks = generatedCode.split(/(?=(?:\/\/\s*)?File:)/);

    blocks.forEach((block) => {
        if (!block.trim()) return;

        const filePathMatch = block.match(/(?:\/\/\s*)?File:\s*([^\n]+)/);
        if (!filePathMatch) return;

        const filePath = filePathMatch[1].trim();
        const codeBlockMatch = block.match(/```(?:\w+)?\n([\s\S]*?)```/);
        const content = codeBlockMatch
            ? codeBlockMatch[1].trim()
            : block.substring(block.indexOf('\n') + 1).trim();

        if (content) {
            fileBlocks.push({ filePath, content });
        }
    });

    return fileBlocks;
}

/**
 * Processes a single file block, saving it to the archive and applying changes.
 */
function processFileBlock(
    block: FileBlock,
    config: Config,
    changesDir: string,
    codeChanges: CodeChangeSummary
): void {
    const fullPath = path.join(config.projectRoot, block.filePath);
    const archivePath = path.join(changesDir, block.filePath);
    const archiveDir = path.dirname(archivePath);

    fs.mkdirSync(archiveDir, { recursive: true });

    if (fileExists(fullPath)) {
        archiveOriginalFile(fullPath, archivePath);
    }

    fs.writeFileSync(archivePath, block.content);
    applyChangesToProject(fullPath, block.content, config, codeChanges);
}

/**
 * Archives the original version of a file.
 */
function archiveOriginalFile(originalPath: string, archivePath: string): void {
    try {
        const originalContent = fs.readFileSync(originalPath, 'utf8');
        fs.writeFileSync(`${archivePath}.orig`, originalContent);
    } catch (err) {
        logger.error(`Failed to archive file '${originalPath}': ${(err as Error).message}`);
    }
}

/**
 * Applies changes to the project, updating the code change summary.
 */
function applyChangesToProject(
    filePath: string,
    content: string,
    config: Config,
    codeChanges: CodeChangeSummary
): void {
    const relativePath = path.relative(config.projectRoot, filePath);

    if (isTestFile(relativePath)) {
        logger.warn(`Skipped modification of test file: '${relativePath}'`);
        return;
    }

    if (isBuildFile(relativePath)) {
        codeChanges.buildFiles.push(relativePath);
    } else if (fileExists(filePath)) {
        codeChanges.modifiedFiles.push(relativePath);
    } else {
        codeChanges.newFiles.push(relativePath);
    }

    const parentDir = path.dirname(filePath);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }

    safeWriteFile(filePath, content).catch((err) =>
        logger.error(`Failed to write file '${filePath}': ${(err as Error).message}`)
    );
}

/**
 * Prepares the directory for storing changes during a generation cycle.
 */
function prepareChangesDirectory(tmpDir: string, cycleNumber: number): string {
    const cycleDir = path.join(tmpDir, `generationCycle${cycleNumber}`);
    const changesDir = path.join(cycleDir, 'changes');
    fs.mkdirSync(changesDir, { recursive: true });
    return changesDir;
}

/**
 * Logs the details of code changes.
 */
function logCodeChanges(codeChanges: CodeChangeSummary): void {
    if (codeChanges.newFiles.length > 0) {
        logger.info(`Created new files: ${codeChanges.newFiles.join(', ')}`);
    }
    if (codeChanges.modifiedFiles.length > 0) {
        logger.info(`Modified files: ${codeChanges.modifiedFiles.join(', ')}`);
    }
    if (codeChanges.buildFiles.length > 0) {
        logger.info(`Updated build files: ${codeChanges.buildFiles.join(', ')}`);
    }
}

/**
 * Initializes an empty code change summary.
 */
function initializeCodeChangeSummary(): CodeChangeSummary {
    return {
        lastChangeTime: new Date(),
        newFiles: [],
        deletedFiles: [],
        modifiedFiles: [],
        buildFiles: []
    };
}