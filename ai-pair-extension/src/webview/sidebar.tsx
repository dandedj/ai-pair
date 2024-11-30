import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { vscodeStyles as styles } from './styles';
import { componentStyles } from './styles/components';
import { StatusBar } from './components/StatusBar';
import { CompilationStatus } from './components/CompilationStatus';
import { TestResults } from './components/TestResults';
import { ProposedChanges, FileChange } from './components/ProposedChanges';

// Declare the vscode API
declare global {
    interface Window {
        acquireVsCodeApi(): any;
    }
}

const vscode = window.acquireVsCodeApi();

const Sidebar: React.FC = () => {
    const [config, setConfig] = React.useState({
        apiKey: '',
        model: 'gpt-4',
        autoWatch: true
    });
    const [isConfigExpanded, setIsConfigExpanded] = React.useState(false);
    const [status, setStatus] = React.useState<'idle' | 'thinking' | 'generating' | 'error'>('idle');
    const [statusMessage, setStatusMessage] = React.useState('AI pair programmer is ready');
    const [proposedChanges, setProposedChanges] = React.useState<FileChange[]>([
        {
            filePath: 'src/components/UserProfile.tsx',
            changeType: 'modify'
        },
        {
            filePath: 'src/styles/theme.css',
            changeType: 'add'
        },
        {
            filePath: 'src/utils/deprecated.ts',
            changeType: 'delete'
        }
    ]);

    const [testResults] = React.useState([
        {
            name: 'UserProfile Component',
            status: 'passed' as const,
            duration: 0.8
        },
        {
            name: 'Authentication Flow',
            status: 'failed' as const,
            duration: 1.2,
            error: 'Expected token to be defined'
        },
        {
            name: 'Theme Utils',
            status: 'passed' as const,
            duration: 0.3
        }
    ]);

    React.useEffect(() => {
        // Handle messages from the extension
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'configUpdate':
                    setConfig(message.config);
                    break;
                case 'statusUpdate':
                    setStatus(message.status);
                    setStatusMessage(message.message);
                    break;
                case 'proposedChanges':
                    setProposedChanges(message.changes);
                    break;
            }
        });
    }, []);

    const handleConfigChange = (key: string, value: any) => {
        vscode.postMessage({
            type: 'updateConfig',
            key,
            value
        });
    };

    const handleViewDiff = (filePath: string) => {
        vscode.postMessage({
            type: 'viewDiff',
            filePath
        });
    };

    return (
        <div style={styles.container}>
            <StatusBar 
                status={status}
                message={statusMessage}
            />
            
            <CompilationStatus isCompiled={true} />
            
            <TestResults results={testResults} />

            <ProposedChanges 
                changes={proposedChanges} 
                onViewDiff={handleViewDiff}
            />

            <div style={componentStyles.panel}>
                <div 
                    style={{
                        ...componentStyles.panelHeader,
                        cursor: 'pointer'
                    }}
                    onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                >
                    <h3 style={componentStyles.panelTitle}>Configuration</h3>
                    <span>{isConfigExpanded ? '▼' : '▶'}</span>
                </div>
                
                {isConfigExpanded && (
                    <div style={{ padding: '12px' }}>
                        <div style={styles.formGroup}>
                            <div style={styles.labelContainer}>API Key:</div>
                            <input
                                type="password"
                                style={styles.input}
                                value={config.apiKey}
                                onChange={e => handleConfigChange('apiKey', e.target.value)}
                            />
                        </div>

                        <div style={styles.formGroup}>
                            <div style={styles.labelContainer}>Model:</div>
                            <select
                                style={styles.select}
                                value={config.model}
                                onChange={e => handleConfigChange('model', e.target.value)}
                            >
                                <option value="gpt-4">GPT-4</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                                <option value="claude-2">Claude 2</option>
                            </select>
                        </div>

                        <div style={styles.formGroup}>
                            <div style={styles.labelContainer}>Auto Watch:</div>
                            <input
                                type="checkbox"
                                style={styles.checkbox}
                                checked={config.autoWatch}
                                onChange={e => handleConfigChange('autoWatch', e.target.checked)}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

ReactDOM.render(
    <Sidebar />,
    document.getElementById('root')
); 