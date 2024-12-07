import * as React from 'react';
import { componentStyles } from '../styles/components';
import { getVSCodeAPI } from '../vscodeApi';

interface LogViewerProps {
    logs: string[];
    isExpanded?: boolean;
    onViewLogs?: (logPath: string) => void;
    config?: { tmpDir: string };
}

export const LogViewer: React.FC<LogViewerProps> = ({ 
    logs, 
    isExpanded = false, 
    onViewLogs,
    config 
}) => {
    const logContainerRef = React.useRef<HTMLDivElement>(null);
    // Get vscode API using React.useMemo to ensure it's only created once
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
                logPath: 'ai-pair.log'  // The log file name
            });
        } else {
            console.warn('VS Code API not available and no onViewLogs callback provided');
        }
    };

    return (
        <div style={{
            ...componentStyles.panel,
            marginTop: '4px',
            flex: 1,
            minHeight: 0
        }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '2px 8px',
                borderBottom: '1px solid var(--vscode-panel-border)'
            }}>
                <span style={{ fontSize: '11px', fontWeight: 600 }}>Logs</span>
                {config && (
                    <button 
                        onClick={handleViewLogs}
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
                    height: '100%',
                    overflowY: 'auto',
                    overflowX: 'auto',
                    whiteSpace: 'pre',
                    backgroundColor: 'var(--vscode-terminal-background)',
                    color: 'var(--vscode-terminal-foreground)'
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