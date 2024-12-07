import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CodeChanges } from '../../components/CodeChanges';

describe('CodeChanges', () => {
    const mockOnViewDiff = jest.fn();
    const mockChanges = [
        { filePath: 'test.ts', changeType: 'add' as const },
        { filePath: 'test2.ts', changeType: 'modify' as const },
    ];

    beforeEach(() => {
        mockOnViewDiff.mockClear();
    });

    it('renders without changes', () => {
        render(<CodeChanges changes={[]} />);
        expect(screen.getByText('Code Changes')).toBeInTheDocument();
    });

    it('renders changes with correct icons', () => {
        render(<CodeChanges changes={mockChanges} />);
        expect(screen.getByText('✚')).toBeInTheDocument();
        expect(screen.getByText('✎')).toBeInTheDocument();
    });

    it('shows correct number of changes', () => {
        render(<CodeChanges changes={mockChanges} />);
        expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('calls onViewDiff when view button is clicked', () => {
        render(<CodeChanges changes={mockChanges} onViewDiff={mockOnViewDiff} />);
        const viewButtons = screen.getAllByText('View');
        fireEvent.click(viewButtons[0]);
        expect(mockOnViewDiff).toHaveBeenCalledWith('test.ts');
    });

    it('shows loading state when isLoading is true', () => {
        render(<CodeChanges changes={[]} isLoading={true} />);
        expect(screen.getByTestId('loading-dots')).toBeInTheDocument();
    });
}); 