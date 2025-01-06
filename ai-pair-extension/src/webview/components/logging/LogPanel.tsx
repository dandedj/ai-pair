import { Config } from 'ai-pair-types';
import * as React from 'react';
import { getVSCodeAPI } from '../../vscodeApi';

interface LogFileGroup {
    name: string;
    files: string[];
}

interface LogPanelProps {
    logs: string[];
    onViewLogs: (logPath: string) => void;
    config?: Config;
    isExpanded: boolean;
    onToggleExpand: () => void;
}

export const LogPanel: React.FC<LogPanelProps> = ({
    logs: initialLogs,
    onViewLogs,
    config,
    isExpanded,
    onToggleExpand
}) => {
    const vscodeApi = React.useMemo(() => getVSCodeAPI(), []);
    const [logGroups, setLogGroups] = React.useState<LogFileGroup[]>([]);
    const [selectedLogFile, setSelectedLogFile] = React.useState<string | null>(null);
    const [logs, setLogs] = React.useState<string[]>(initialLogs);
    const logContainerRef = React.useRef<HTMLDivElement>(null);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        // Request log files list when component mounts
        vscodeApi?.postMessage({ type: 'requestLogFiles' });

        // Set up polling for log updates
        const logInterval = setInterval(() => {
            if (selectedLogFile && isExpanded) {
                vscodeApi?.postMessage({ type: 'requestLogs' });
            }
        }, 1000);

        const handleMessage = (event: MessageEvent) => {
            try {
                const message = event.data;

                if (message.type === 'logFilesList') {
                    if (!Array.isArray(message.groups)) {
                        setError('Invalid log files data received');
                        return;
                    }

                    setLogGroups(message.groups);

                    // Set initial selected file if not set
                    if (!selectedLogFile && message.groups.length > 0) {
                        const firstGroup = message.groups.find((g: LogFileGroup) => g.files.length > 0);
                        if (firstGroup) {
                            const firstFile = firstGroup.files[0];
                            setSelectedLogFile(firstFile);
                            vscodeApi?.postMessage({ 
                                type: 'selectLogFile',
                                logFile: firstFile
                            });
                        }
                    }
                } else if (message.type === 'logUpdate' && Array.isArray(message.logs)) {
                    setLogs(prevLogs => [...prevLogs, ...message.logs]);
                }
            } catch (err) {
                console.error('Error handling message:', err);
                setError('Error loading log files');
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
            clearInterval(logInterval);
        };
    }, [vscodeApi, selectedLogFile, isExpanded]);

    // Clear logs when selecting a new file
    React.useEffect(() => {
        setLogs([]);
    }, [selectedLogFile]);

    React.useEffect(() => {
        if (logContainerRef.current) {
            logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }
    }, [logs]);

    const handleLogFileChange = (logFile: string) => {
        setSelectedLogFile(logFile);
        setLogs([]); // Clear logs when changing files
        vscodeApi?.postMessage({ 
            type: 'selectLogFile',
            logFile: logFile
        });
        // Request logs immediately after changing file
        vscodeApi?.postMessage({ type: 'requestLogs' });
    };

    if (error) {
        return (
            <div style={{ padding: '8px', color: 'var(--vscode-errorForeground)' }}>
                {error}
            </div>
        );
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            backgroundColor: 'var(--vscode-panel-background)',
            borderTop: '1px solid var(--vscode-panel-border)',
            height: isExpanded ? '40%' : '30px',
            transition: 'height 0.2s ease-in-out',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            zIndex: 1000
        }}>
            <div style={{
                padding: '4px 8px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                borderBottom: isExpanded ? '1px solid var(--vscode-panel-border)' : 'none',
                minHeight: '30px',
                backgroundColor: 'var(--vscode-panel-background)'
            }}>
                <button
                    className={`codicon codicon-chevron-${isExpanded ? 'down' : 'right'}`}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '4px',
                        cursor: 'pointer',
                        transition: 'transform 0.2s ease',
                        color: 'var(--vscode-foreground)'
                    }}
                    onClick={onToggleExpand}
                    title={isExpanded ? 'Collapse' : 'Expand'}
                />
                <span style={{ 
                    fontSize: '12px', 
                    fontWeight: 'bold',
                    color: 'var(--vscode-foreground)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                }}>
                    Logs {selectedLogFile ? `- ${selectedLogFile.split('/').pop()}` : ''}
                </span>
                {isExpanded && (
                    <>
                        <select
                            value={selectedLogFile || ''}
                            onChange={(e) => handleLogFileChange(e.target.value)}
                            style={{
                                backgroundColor: 'var(--vscode-dropdown-background)',
                                color: 'var(--vscode-dropdown-foreground)',
                                border: '1px solid var(--vscode-dropdown-border)',
                                padding: '2px 4px',
                                fontSize: '12px',
                                flex: 1
                            }}
                        >
                            <option value="" disabled>
                                Select a log file... ({logGroups.reduce((sum: number, g: LogFileGroup) => sum + g.files.length, 0)} files)
                            </option>
                            {logGroups.map(group => (
                                group.files.length > 0 && (
                                    <optgroup key={group.name} label={`${group.name} (${group.files.length})`}>
                                        {group.files.map(file => (
                                            <option key={file} value={file}>
                                                {file.split('/').pop()}
                                            </option>
                                        ))}
                                    </optgroup>
                                )
                            ))}
                        </select>
                        <button
                            style={{
                                background: 'none',
                                border: 'none',
                                padding: '4px 8px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                color: 'var(--vscode-textLink-foreground)',
                                opacity: selectedLogFile ? 1 : 0.5
                            }}
                            onClick={() => selectedLogFile && config?.tmpDir && onViewLogs(selectedLogFile)}
                            disabled={!selectedLogFile}
                            title={selectedLogFile ? 'View in editor' : 'Select a log file first'}
                        >
                            View in Editor
                        </button>
                    </>
                )}
            </div>
            {isExpanded && selectedLogFile && (
                <div
                    ref={logContainerRef}
                    style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '8px',
                        fontFamily: 'var(--vscode-editor-font-family)',
                        fontSize: '12px',
                        backgroundColor: 'var(--vscode-panel-background)',
                        color: 'var(--vscode-foreground)'
                    }}
                >
                    {logs.map((log, index) => (
                        <div key={index} style={{ whiteSpace: 'pre-wrap', marginBottom: '2px' }}>
                            {log}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}; 