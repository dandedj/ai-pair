import fs from 'fs';
import path from 'path';
import { collectFilesWithExtension, clearDirectory, ensureDirectoryExists, clearFile } from '../../src/lib/file-utils';

jest.mock('fs');

describe('File Utils', () => {
  const mockDir = '/mockDir';
  const mockFile = '/mockDir/mockFile.txt';
  const mockContent = 'Hello, World!';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('collectFilesWithExtension', () => {
    it('should collect files with the specified extension', () => {
      (fs.readdirSync as jest.Mock).mockReturnValue(['mockFile.txt', 'otherFile.js']);
      (fs.statSync as jest.Mock).mockReturnValue({ isDirectory: () => false });
      (fs.readFileSync as jest.Mock).mockReturnValue(mockContent);

      const files = collectFilesWithExtension([mockDir], '.txt');
      expect(files).toEqual([{ path: path.join(mockDir, 'mockFile.txt'), content: mockContent }]);
    });
  });

  describe('clearDirectory', () => {
    it('should clear all files in a directory', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      (fs.readdirSync as jest.Mock).mockReturnValue(['mockFile.txt']);
      (fs.lstatSync as jest.Mock).mockReturnValue({ isDirectory: () => false });

      clearDirectory(mockDir);

      expect(fs.unlinkSync).toHaveBeenCalledWith(path.join(mockDir, 'mockFile.txt'));
    });
  });

  describe('ensureDirectoryExists', () => {
    it('should create a directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      ensureDirectoryExists(mockDir);

      expect(fs.mkdirSync).toHaveBeenCalledWith(mockDir, { recursive: true });
    });

    it('should not create a directory if it already exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      ensureDirectoryExists(mockDir);

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('clearFile', () => {
    it('should clear the contents of a file', () => {
      clearFile(mockFile);

      expect(fs.writeFileSync).toHaveBeenCalledWith(mockFile, '');
    });
  });
}); 