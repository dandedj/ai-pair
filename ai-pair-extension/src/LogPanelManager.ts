import { readdir, stat } from 'fs/promises';
import { existsSync } from 'fs';
import { open } from 'fs/promises';
import * as path from 'path';
import * as vscode from 'vscode';

export interface LogFileGroup {
    name: string;
    files: string[];
}

export class LogPanelManager {
    private _logPositions: Map<string, number> = new Map();
    private _baseLogPath: string;
    private _currentLogPath: string;
    private _lastRefresh: number = 0;
    private _cachedGroups: LogFileGroup[] | null = null;
    private _refreshPromise: Promise<LogFileGroup[]> | null = null;

    constructor(baseLogPath: string) {
        this._baseLogPath = baseLogPath;
        this._currentLogPath = path.join(baseLogPath, 'ai-pair.log');
        this._logPositions.set(this._currentLogPath, 0);
    }

    public async listLogFiles(): Promise<LogFileGroup[]> {
        // Return cached results if within throttle window
        const now = Date.now();
        if (this._cachedGroups && now - this._lastRefresh < 500) {
            return this._cachedGroups;
        }

        // If a refresh is already in progress, return its promise
        if (this._refreshPromise) {
            return this._refreshPromise;
        }

        // Start a new refresh
        this._refreshPromise = this._refreshLogFiles();
        try {
            const groups = await this._refreshPromise;
            this._lastRefresh = now;
            this._cachedGroups = groups;
            return groups;
        } finally {
            this._refreshPromise = null;
        }
    }

    private async _refreshLogFiles(): Promise<LogFileGroup[]> {
        const groups: LogFileGroup[] = [{ name: 'Root', files: [] }];
        const baseDir = this._baseLogPath;

        try {
            // Check if directory exists before proceeding
            try {
                await stat(baseDir);
            } catch {
                return groups;
            }

            // List root directory log files
            const rootEntries = await readdir(baseDir, { withFileTypes: true });
            groups[0].files = rootEntries
                .filter(entry => entry.isFile() && entry.name.endsWith('.log'))
                .map(entry => entry.name);

            // List all generationCycle directories
            const cycleDirs = rootEntries.filter(entry => 
                entry.isDirectory() && entry.name.startsWith('generationCycle')
            );

            // Process each cycle directory in parallel
            const cyclePromises = cycleDirs.map(async entry => {
                try {
                    const cycleDir = path.join(baseDir, entry.name);
                    const files = await readdir(cycleDir);
                    const logFiles = files
                        .filter(file => file.endsWith('.log'))
                        .map(file => `${entry.name}/${file}`);

                    if (logFiles.length > 0) {
                        return {
                            name: entry.name,
                            files: logFiles
                        };
                    }
                } catch (error) {
                    console.error(`Error reading cycle directory ${entry.name}:`, error);
                }
                return null;
            });

            const cycleGroups = (await Promise.all(cyclePromises))
                .filter((group): group is LogFileGroup => group !== null);
            
            groups.push(...cycleGroups);

        } catch (error) {
            console.error('Error listing log files:', error);
        }

        return groups;
    }

    public setCurrentLogFile(logPath: string) {
        const fullPath = path.join(this._baseLogPath, logPath);
        this._currentLogPath = fullPath;
        // Reset position when switching files
        this._logPositions.set(this._currentLogPath, 0);
    }

    public async readNewLogs(): Promise<string[]> {
        try {
            // Check if file exists
            try {
                await stat(this._currentLogPath);
            } catch {
                return [];
            }

            const fileHandle = await open(this._currentLogPath, 'r');
            try {
                const stats = await fileHandle.stat();
                const currentPosition = this._logPositions.get(this._currentLogPath) || 0;

                if (stats.size < currentPosition) {
                    // Log file was truncated, reset position
                    this._logPositions.set(this._currentLogPath, 0);
                }

                if (stats.size === currentPosition) {
                    // No new content
                    return [];
                }

                const buffer = Buffer.alloc(stats.size - currentPosition);
                const { bytesRead } = await fileHandle.read(buffer, 0, buffer.length, currentPosition);
                
                if (bytesRead === 0) {
                    return [];
                }

                this._logPositions.set(this._currentLogPath, currentPosition + bytesRead);

                const newLogs = buffer.toString()
                    .split('\n')
                    .filter(line => {
                        const trimmed = line.trim();
                        return trimmed !== '' && 
                               (trimmed.includes('[DEBUG]') || trimmed.includes('[INFO]') || trimmed.includes('[ERROR]'));
                    })
                    .map(line => line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\s+\[[^\]]+\]\s+/, ''));

                return newLogs;
            } finally {
                await fileHandle.close();
            }
        } catch (error) {
            console.error('Error reading logs:', error);
            return [];
        }
    }

    public async viewLogFile(logPath: string): Promise<void> {
        try {
            await stat(logPath);
            await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(logPath));
        } catch {
            vscode.window.showErrorMessage(`Log file not found: ${logPath}`);
        }
    }
} 