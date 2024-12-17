import { Config, Status } from 'ai-pair';
import * as React from 'react';
import { componentStyles } from '../../styles/components';
import { StatusIndicator } from '../StatusIndicator';

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
    console.log('StatusBar rendering with status:', status);
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
                    onClick={status === Status.IDLE ? onStart : onStop}
                    title={status === Status.IDLE ? 'Start AI Pair' : 'Stop AI Pair'}
                >
                    <span className={`codicon codicon-${status === Status.IDLE ? 'play' : 'stop'}`} />
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