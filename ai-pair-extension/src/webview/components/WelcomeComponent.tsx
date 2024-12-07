import * as React from 'react';
import { componentStyles } from '../styles/components';

interface WelcomeComponentProps {
    onOpenSettings: () => void;
    onStart: () => void;
}

export const WelcomeComponent: React.FC<WelcomeComponentProps> = ({ 
    onOpenSettings,
    onStart
}) => {
    return (
        <div style={componentStyles.panel}>
            <div style={{ padding: '16px', fontSize: '13px', lineHeight: '1.4' }}>
                <p>AI Pair is a pair programmer that uses unit tests to generate functional code.</p>
                <p style={{ marginTop: '16px' }}>To get started with AI Pair:</p>
                <ol style={{ paddingLeft: '20px', marginTop: '8px' }}>
                    <li>Enter your API keys in the <button 
                        onClick={onOpenSettings}
                        style={componentStyles.linkButton}>
                        settings
                    </button></li>
                    <li>Create tests for code you want to be created</li>
                    <li>Click the <button 
                        onClick={onStart}
                        style={componentStyles.linkButton}>
                        play button <span className="codicon codicon-play" />
                    </button> to start a new generation cycle</li>
                </ol>
            </div>
        </div>
    );
}; 