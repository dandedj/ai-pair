import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodeChanges } from './CodeChanges';
import { getVSCodeAPI } from '../../vscodeApi';

// Mock the VS Code API
jest.mock('../../vscodeApi', () => ({
    getVSCodeAPI: jest.fn()
}));

describe('CodeChanges', () => {
    const mockOnViewDiff = jest.fn();
    const mockOnViewLog = jest.fn();
    const mockPostMessage = jest.fn();
    const cycleNumber = 1;

    const mockChanges = [
        { filePath: 'test.ts', changeType: 'add' as const },
        { filePath: 'test2.ts', changeType: 'modify' as const },
        { filePath: 'test3.ts', changeType: 'delete' as const }
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        (getVSCodeAPI as jest.Mock).mockReturnValue({ postMessage: mockPostMessage });
    });

    it('renders empty state correctly', () => {
        render(<CodeChanges changes={[]} />);
        expect(screen.getByText('Code Changes')).toBeInTheDocument();
        expect(screen.getByText('0')).toBeInTheDocument();
    });

    it('renders all types of changes with correct icons', () => {
        render(<CodeChanges changes={mockChanges} />);
        
        // Check for icons
        expect(screen.getByText('✚')).toBeInTheDocument(); // Add
        expect(screen.getByText('✎')).toBeInTheDocument(); // Modify
        expect(screen.getByText('✖')).toBeInTheDocument(); // Delete
        
        // Check for file paths
        expect(screen.getByText('test.ts')).toBeInTheDocument();
        expect(screen.getByText('test2.ts')).toBeInTheDocument();
        expect(screen.getByText('test3.ts')).toBeInTheDocument();
        
        // Check for change count
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('triggers onViewDiff callback when provided', () => {
        render(<CodeChanges changes={mockChanges} onViewDiff={mockOnViewDiff} />);
        const viewButtons = screen.getAllByText('View Diff');
        fireEvent.click(viewButtons[0]);
        expect(mockOnViewDiff).toHaveBeenCalledWith('test.ts');
        expect(mockPostMessage).not.toHaveBeenCalled();
    });

    it('sends VS Code message when no onViewDiff callback provided', () => {
        render(<CodeChanges changes={mockChanges} cycleNumber={cycleNumber} />);
        const viewButtons = screen.getAllByText('View Diff');
        fireEvent.click(viewButtons[0]);
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: 'viewDiff',
            filePath: 'test.ts',
            cycleNumber: cycleNumber,
            originalPath: 'test.ts.orig'
        });
    });

    it('shows view log button when cycleNumber is provided', () => {
        render(<CodeChanges 
            changes={[]} 
            cycleNumber={1}
        />);
        
        const logButton = screen.getByText('View Logs');
        expect(logButton).toBeInTheDocument();
        
        // Mock vscode API
        const mockPostMessage = jest.fn();
        (window as any).acquireVsCodeApi = () => ({
            postMessage: mockPostMessage
        });
        
        fireEvent.click(logButton);
        
        expect(mockPostMessage).toHaveBeenCalledWith({
            type: 'view',
            cycleNumber: 1,
            logType: 'changes',
            stage: 'request'
        });
    });

}); 