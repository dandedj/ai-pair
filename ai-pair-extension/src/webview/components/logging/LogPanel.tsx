import * as React from 'react';
import { componentStyles } from '../../styles/components';
import { getVSCodeAPI } from '../../vscodeApi';

interface LogPanelProps {
    logs: string[];
    isExpanded: boolean;
    onToggleExpand: () => void;
    onViewLogs?: (logPath: string) => void;
    config?: { tmpDir: string };
}

export const LogPanel: React.FC<LogPanelProps> = ({ 
    logs, 
    isExpanded,
    onToggleExpand,
    onViewLogs,
    config 
}) => {
    const logContainerRef = React.useRef<HTMLDivElement>(null);
    const vscodeApi = React.useMemo(() => getVSCodeAPI(), []);

    React.useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const handleViewLogs = () => {
        if (onViewLogs) {
            onViewLogs('ai-pair.log');
        } else if (vscodeApi) {
            vscodeApi.postMessage({ 
                type: 'viewLogs',
                logPath: 'ai-pair.log'
            });
        }
    };

    const handleHeaderClick = (e: React.MouseEvent) => {
        console.log('Header clicked, current isExpanded:', isExpanded);
        onToggleExpand();
    };

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'var(--vscode-editor-background)',
            borderTop: '1px solid var(--vscode-panel-border)',
            transition: 'height 0.2s ease-in-out',
            height: isExpanded ? '40vh' : '30px',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column'
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '4px 8px',
                cursor: 'pointer',
                backgroundColor: 'var(--vscode-editor-background)',
                borderBottom: isExpanded ? '1px solid var(--vscode-panel-border)' : 'none',
                height: '30px',
                flexShrink: 0
            }}
            onClick={handleHeaderClick}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span 
                        className={`codicon codicon-chevron-${isExpanded ? 'down' : 'up'}`}
                        style={{ fontSize: '14px' }}
                    />
                    <span style={{ fontSize: '11px', fontWeight: 600 }}>Logs</span>
                </div>
                {config && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            handleViewLogs();
                        }}
                        style={componentStyles.linkButton}
                    >
                        View Full Log
                    </button>
                )}
            </div>
            <div
                ref={logContainerRef}
                style={{
                    padding: '4px',
                    fontSize: '9px',
                    fontFamily: 'var(--vscode-editor-font-family)',
                    flex: 1,
                    overflowY: 'auto',
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    backgroundColor: 'var(--vscode-terminal-background)',
                    color: 'var(--vscode-terminal-foreground)',
                    display: isExpanded ? 'block' : 'none'
                }}
            >
                {logs.map((log, index) => (
                    <div 
                        key={index} 
                        style={{ 
                            marginBottom: '1px',
                            textOverflow: 'ellipsis',
                            minWidth: 'fit-content'
                        }}
                    >
                        {log}
                    </div>
                ))}
            </div>
        </div>
    );
}; 