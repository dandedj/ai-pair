import * as React from 'react';

const loadingDotsStyle = {
    container: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '0 4px'
    },
    dot: {
        width: '4px',
        height: '4px',
        backgroundColor: 'var(--vscode-foreground)',
        borderRadius: '50%',
        animation: 'pulse 1.4s infinite',
        animationFillMode: 'both'
    },
    dot2: {
        animationDelay: '0.2s'
    },
    dot3: {
        animationDelay: '0.4s'
    }
} as const;

const keyframes = `
@keyframes pulse {
    0%, 80%, 100% { 
        opacity: 0.4;
        transform: scale(0.8);
    }
    40% { 
        opacity: 1;
        transform: scale(1);
    }
}`;

export const LoadingDots: React.FC = () => {
    React.useEffect(() => {
        // Add keyframes to document
        const style = document.createElement('style');
        style.textContent = keyframes;
        document.head.appendChild(style);
        return () => style.remove();
    }, []);

    return (
        <div style={loadingDotsStyle.container}>
            <div style={loadingDotsStyle.dot} />
            <div style={{ ...loadingDotsStyle.dot, ...loadingDotsStyle.dot2 }} />
            <div style={{ ...loadingDotsStyle.dot, ...loadingDotsStyle.dot3 }} />
        </div>
    );
}; 