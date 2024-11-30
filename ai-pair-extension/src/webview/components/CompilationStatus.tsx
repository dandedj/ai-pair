import * as React from 'react';
import { componentStyles } from '../styles/components';
import { LoadingDots } from './LoadingDots';

interface CompilationStatusProps {
    isCompiled: boolean;
    isLoading?: boolean;
}

export const CompilationStatus: React.FC<CompilationStatusProps> = ({ 
    isCompiled,
    isLoading = false 
}) => {
    return (
        <div style={componentStyles.panel}>
            <div style={componentStyles.panelHeader}>
                <h3 style={componentStyles.panelTitle}>Compilation Status</h3>
                {isLoading ? (
                    <LoadingDots />
                ) : isCompiled ? (
                    <span style={componentStyles.successBadge}>✓ Compiled</span>
                ) : (
                    <span style={componentStyles.badge}>Compiling...</span>
                )}
            </div>
        </div>
    );
}; 