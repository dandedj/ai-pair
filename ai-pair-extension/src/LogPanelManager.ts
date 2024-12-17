import * as vscode from 'vscode';
import * as path from 'path';
import { readFile, open } from 'fs/promises';
import { existsSync, statSync } from 'fs';

export class LogPanelManager {
    private _lastLogPosition: number = 0;
    private _logPath: string;

    constructor(logPath: string) {
        this._logPath = logPath;
    }

    public async readNewLogs(): Promise<string[]> {
        try {
            if (!existsSync(this._logPath)) {
                return [];
            }

            const stats = statSync(this._logPath);
            if (stats.size < this._lastLogPosition) {
                // Log file was truncated, reset position
                this._lastLogPosition = 0;
            }

            const fileHandle = await open(this._logPath, 'r');
            const buffer = Buffer.alloc(stats.size - this._lastLogPosition);
            
            await fileHandle.read(buffer, 0, buffer.length, this._lastLogPosition);
            await fileHandle.close();

            this._lastLogPosition = stats.size;

            return buffer.toString()
                .split('\n')
                .filter(line => {
                    const trimmed = line.trim();
                    return trimmed !== '' && 
                           (trimmed.includes('[DEBUG]') || trimmed.includes('[INFO]') || trimmed.includes('[ERROR]'));
                })
                .map(line => line.replace(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\s+\[[^\]]+\]\s+/, ''));
        } catch (error) {
            console.error('Error reading logs:', error);
            return [];
        }
    }

    public async viewLogFile(logPath: string): Promise<void> {
        if (existsSync(logPath)) {
            await vscode.commands.executeCommand('vscode.open', vscode.Uri.file(logPath));
        } else {
            vscode.window.showErrorMessage(`Log file not found: ${logPath}`);
        }
    }
} 