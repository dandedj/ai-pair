import * as React from 'react';
import { componentStyles } from '../styles/components';

export const LoadingDots: React.FC = () => {
    return (
        <div style={componentStyles.loadingContainer}>
            <span style={componentStyles.loadingDot} />
            <span style={componentStyles.loadingDot} />
            <span style={componentStyles.loadingDot} />
        </div>
    );
}; 