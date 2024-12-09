import * as React from 'react';
import { componentStyles } from '../styles/components';
import { LoadingDots } from './LoadingDots';
import { Status, Config } from 'ai-pair';
import { StatusIndicator } from './StatusIndicator';

declare const vscode: any;

interface StatusBarProps {
    status: Status;
    config: Config | null;
    forceGeneration: boolean;
    onToggleWatch: () => void;
    onToggleForce: () => void;
    onOpenSettings: () => void;
    onStart: () => void;
    onStop: () => void;
}

export const StatusBar: React.FC<StatusBarProps> = ({ 
    status,
    config,
    forceGeneration,
    onToggleWatch,
    onToggleForce,
    onOpenSettings,
    onStart,
    onStop
}) => {
    return (
        <div style={componentStyles.statusBar}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <StatusIndicator status={status} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {config && (
                    <>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--vscode-foreground)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={config.autoWatch}
                                onChange={onToggleWatch}
                                style={{ margin: 0 }}
                            />
                            Watch
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--vscode-foreground)', cursor: 'pointer' }}>
                            <input
                                type="checkbox"
                                checked={forceGeneration}
                                onChange={onToggleForce}
                                style={{ margin: 0 }}
                            />
                            Force Generation
                        </label>
                    </>
                )}
                <button
                    style={componentStyles.iconButton}
                    onClick={status === 'idle' ? onStart : onStop}
                    title={status === 'idle' ? 'Start AI Pair' : 'Stop AI Pair'}
                >
                    <span className={`codicon codicon-${status === 'idle' ? 'play' : 'stop'}`} />
                </button>
                <button
                    style={componentStyles.iconButton}
                    onClick={onOpenSettings}
                    title="Settings"
                >
                    <span className="codicon codicon-gear" />
                </button>
            </div>
        </div>
    );
}; 