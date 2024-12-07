import { jest, expect } from '@jest/globals';
import fs from 'fs';
import { fileExists, isBuildFile, isTestFile, ensureDirectoryExists, safeWriteFile, clearDirectory, collectFilesWithExtension } from '../../src/lib/file-utils';

jest.mock('fs');
jest.mock('../../src/lib/logger');

describe('file-utils', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('clearDirectory', () => {
        it('should clear and recreate directory if it exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            clearDirectory('/test/dir');
            expect(fs.rmSync).toHaveBeenCalledWith('/test/dir', { recursive: true });
            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir', { recursive: true });
        });

        it('should only create directory if it does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            clearDirectory('/test/dir');
            expect(fs.rmSync).not.toHaveBeenCalled();
            expect(fs.mkdirSync).toHaveBeenCalledWith('/test/dir', { recursive: true });
        });
    });

    describe('collectFilesWithExtension', () => {
        it('should collect files with specified extension', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock).mockReturnValue(['file1.ts', 'file2.js', 'file3.ts']);
            (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false });
            (fs.readFileSync as jest.Mock).mockReturnValue('file content');

            const files = collectFilesWithExtension(['/test/dir'], '.ts');
            expect(files).toHaveLength(2);
            expect(files[0].path).toBe('/test/dir/file1.ts');
            expect(files[0].content).toBe('file content');
        });

        it('should handle nested directories', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            (fs.readdirSync as jest.Mock)
                .mockReturnValueOnce(['file1.ts', 'subdir'])
                .mockReturnValueOnce(['file2.ts']);
            (fs.statSync as jest.Mock)
                .mockReturnValueOnce({ isDirectory: () => false })
                .mockReturnValueOnce({ isDirectory: () => true })
                .mockReturnValueOnce({ isDirectory: () => false });
            (fs.readFileSync as jest.Mock).mockReturnValue('file content');

            const files = collectFilesWithExtension(['/test/dir'], '.ts');
            expect(files).toHaveLength(2);
        });
    });

    describe('fileExists', () => {
        it('should return true when file exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            expect(fileExists('existing-file.txt')).toBe(true);
        });

        it('should return false when file does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            expect(fileExists('non-existing-file.txt')).toBe(false);
        });

        it('should return false when error occurs', () => {
            (fs.existsSync as jest.Mock).mockImplementation(() => {
                throw new Error('Access denied');
            });
            expect(fileExists('error-file.txt')).toBe(false);
        });
    });

    describe('isBuildFile', () => {
        it('should identify build files correctly', () => {
            expect(isBuildFile('build.gradle.kts')).toBe(true);
        });

        it('should return false for non-build files', () => {
            expect(isBuildFile('app.js')).toBe(false);
            expect(isBuildFile('index.html')).toBe(false);
            expect(isBuildFile('styles.css')).toBe(false);
        });
    });

    describe('isTestFile', () => {
        it('should identify test files correctly', () => {
            expect(isTestFile('src/test/com/example/Test.java')).toBe(true);
            expect(isTestFile('src/__tests__/component.test.tsx')).toBe(true);
            expect(isTestFile('spec/unit/test.spec.js')).toBe(true);
            expect(isTestFile('src/__mocks__/service.ts')).toBe(true);
        });

        it('should return false for non-test files', () => {
            expect(isTestFile('src/main/com/example/Class.java')).toBe(false);
            expect(isTestFile('src/components/Button.tsx')).toBe(false);
        });
    });

    describe('ensureDirectoryExists', () => {
        it('should create directory if it does not exist', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(false);
            ensureDirectoryExists('/path/to/file.txt');
            expect(fs.mkdirSync).toHaveBeenCalledWith('/path/to', { recursive: true });
        });

        it('should not create directory if it exists', () => {
            (fs.existsSync as jest.Mock).mockReturnValue(true);
            ensureDirectoryExists('/path/to/file.txt');
            expect(fs.mkdirSync).not.toHaveBeenCalled();
        });
    });

    describe('safeWriteFile', () => {
        it('should ensure directory exists and write file', () => {
            safeWriteFile('/path/to/file.txt', 'content');
            expect(fs.writeFileSync).toHaveBeenCalledWith('/path/to/file.txt', 'content', 'utf-8');
        });
    });
}); 