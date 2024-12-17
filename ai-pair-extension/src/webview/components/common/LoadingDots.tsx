import * as React from 'react';

interface LoadingDotsProps {
    label?: string;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({ label }) => {
    const styles = {
        loadingDots: {
            display: 'flex',
            gap: '4px',
            alignItems: 'center'
        },
        dot: {
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: 'currentColor',
            animation: 'loading-dots 1s infinite ease-in-out'
        }
    };

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {label && <span>{label} </span>}
            <div className="loading-dots" style={styles.loadingDots}>
                <div className="dot" style={{...styles.dot, animationDelay: '0s'}}></div>
                <div className="dot" style={{...styles.dot, animationDelay: '0.2s'}}></div>
                <div className="dot" style={{...styles.dot, animationDelay: '0.4s'}}></div>
            </div>
            <style>{`
                @keyframes loading-dots {
                    0%, 80%, 100% { transform: scale(0); opacity: 0; }
                    40% { transform: scale(1); opacity: 1; }
                }
            `}</style>
        </div>
    );
}; 