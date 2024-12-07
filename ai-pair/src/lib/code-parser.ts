import path from 'path';
import fs from 'fs';
import { Config } from '../types/config';
import { RunningState, CodeChangeSummary } from '../types/running-state';
import { logger } from './logger';
import { fileExists, isBuildFile, isTestFile, safeWriteFile } from './file-utils';

interface FileBlock {
    filePath: string;
    content: string;
}

export function parseAndApplyGeneratedCode(config: Config, runningState: RunningState, generatedCode: string): CodeChangeSummary {
    const codeChanges: CodeChangeSummary = {
        lastChangeTime: new Date(),
        newFiles: [],
        deletedFiles: [],
        modifiedFiles: [],
        buildFiles: []
    };

    const fileBlocks = extractFileBlocks(generatedCode);
    
    // Create changes directory for this cycle
    const cycleDir = path.join(config.tmpDir, `generationCycle${runningState.generationCycleDetails.length}`);
    const changesDir = path.join(cycleDir, 'changes');
    fs.mkdirSync(changesDir, { recursive: true });

    // Process each file block
    fileBlocks.forEach(block => {
        const filePath = block.filePath;
        const fullPath = path.join(config.projectRoot, filePath);
        const archivePath = path.join(changesDir, filePath);
        const archiveDir = path.dirname(archivePath);

        // Create directory structure if it doesn't exist
        fs.mkdirSync(archiveDir, { recursive: true });

        // If file exists, save original version
        if (fs.existsSync(fullPath)) {
            const originalContent = fs.readFileSync(fullPath, 'utf8');
            fs.writeFileSync(`${archivePath}.orig`, originalContent);
        }

        // Write new version to archive
        fs.writeFileSync(archivePath, block.content);
        
        // Apply changes to actual project using writeFile for proper side effects
        writeFile(filePath, block.content, config, codeChanges);
    });

    // Log changes
    if (codeChanges.newFiles.length === 0 && codeChanges.modifiedFiles.length === 0 && codeChanges.buildFiles.length === 0) {
        logger.warn('No valid code blocks found in generated code');
    } else {
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

    return codeChanges;
}

export function extractFileBlocks(generatedCode: string): FileBlock[] {
    const fileBlocks: FileBlock[] = [];
    const blocks = generatedCode.split(/(?=(?:\/\/\s*)?File:)/);
    
    for (const block of blocks) {
        if (!block.trim()) continue;

        // Extract file path
        const fileMatch = block.match(/(?:\/\/\s*)?File:\s*([^\n]+)/);
        if (!fileMatch) continue;
        
        const filePath = fileMatch[1].trim();
        
        // Try markdown code block first
        const codeBlockMatch = block.match(/```(?:\w+)?\n([\s\S]*?)```/);
        
        // If no markdown block found, try to extract content after the file path
        if (!codeBlockMatch) {
            const contentMatch = block.substring(block.indexOf('\n') + 1).trim();
            if (contentMatch) {
                fileBlocks.push({
                    filePath,
                    content: contentMatch
                });
                continue;
            }
        } else {
            fileBlocks.push({
                filePath,
                content: codeBlockMatch[1].trim()
            });
        }
    }
    
    return fileBlocks;
}

function writeFile(filePath: string, content: string, config: Config, codeChanges: CodeChangeSummary): void {
    const fullPath = path.join(config.projectRoot, filePath);
    const relativePath = path.relative(config.projectRoot, fullPath);

    // Skip test files
    if (isTestFile(relativePath)) {
        logger.warn(`Attempted to modify a test file: ${relativePath}`);
        return;
    }

    // Determine file type and update code changes
    if (isBuildFile(relativePath)) {
        codeChanges.buildFiles.push(relativePath);
    } else if (fileExists(fullPath)) {
        codeChanges.modifiedFiles.push(relativePath);
    } else {
        codeChanges.newFiles.push(relativePath);
    }

    // Create parent directories if they don't exist
    const parentDir = path.dirname(fullPath);
    if (!fs.existsSync(parentDir)) {
        fs.mkdirSync(parentDir, { recursive: true });
    }

    safeWriteFile(fullPath, content);
} 