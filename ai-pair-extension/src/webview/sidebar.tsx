import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { vscodeStyles as styles } from './styles';
import { componentStyles } from './styles/components';
import { StatusBar } from './components/StatusBar';
import { BuildState } from './components/BuildState';
import { TestResults } from './components/TestResults';
import { CodeChanges, FileChange } from './components/CodeChanges';
import { LogViewer } from './components/LogViewer';
import { Status, RunningState, Config } from 'ai-pair';
import { CycleDetails } from './components/CycleDetails';
import { GenerationCycleDetails } from '../types/running-state';
import { WelcomeComponent } from './components/WelcomeComponent';
import { TimingDetails } from './components/TimingDetails';
import { getVSCodeAPI } from './vscodeApi';
import path from 'path';

export const Sidebar: React.FC = () => {
    // Get vscode API using React.useMemo to ensure it's only created once
    const vscodeApi = React.useMemo(() => getVSCodeAPI(), []);

    const [runningState, setRunningState] = React.useState<RunningState | null>(() => {
        const state = vscodeApi?.getState();
        return state?.runningState || null;
    });
    const [config, setConfig] = React.useState<Config | null>(() => {
        const state = vscodeApi?.getState();
        return state?.config || null;
    });
    const [logs, setLogs] = React.useState<string[]>(() => {
        const state = vscodeApi?.getState();
        return state?.logs || [];
    });
    const [isLogExpanded, setIsLogExpanded] = React.useState(false);
    const [selectedCycle, setSelectedCycle] = React.useState<GenerationCycleDetails | null>(() => {
        const state = vscodeApi?.getState();
        return state?.selectedCycle || null;
    });

    // Update persisted state whenever it changes
    React.useEffect(() => {
        if (vscodeApi) {
            vscodeApi.setState({
                runningState,
                config,
                logs,
                selectedCycle
            });
        }
    }, [runningState, config, logs, selectedCycle, vscodeApi]);

    React.useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            const message = event.data;

            switch (message.type) {
                case 'stateUpdate':
                    setRunningState(message.state);
                    setSelectedCycle(null);
                    break;
                case 'configUpdate':
                    setConfig(message.config);
                    break;
                case 'logUpdate':
                    if (Array.isArray(message.logs)) {
                        setLogs(message.logs);
                    } else {
                        console.warn('Received invalid logs format:', message.logs);
                    }
                    break;
            }
        };

        // Add event listener
        window.addEventListener('message', handleMessage);
        
        console.log('Setting up log polling...');
        
        // Request initial logs
        if (vscodeApi) {
            console.log('Requesting initial logs...');
            vscodeApi.postMessage({ type: 'requestLogs' });
        }
        
        // Set up periodic log updates
        const logInterval = setInterval(() => {
            if (vscodeApi) {
                // console.log('Polling for logs...');
                vscodeApi.postMessage({ type: 'requestLogs' });
            }
        }, 500);

        return () => {
            window.removeEventListener('message', handleMessage);
            clearInterval(logInterval);
        };
    }, [vscodeApi]);

    // Don't render until we have the initial state
    if (!runningState) {
        return null;
    }

    const handleViewDiff = (filePath: string) => {
        vscodeApi?.postMessage({ type: 'viewDiff', filePath });
    };

    const openSettings = () => {
        vscodeApi?.postMessage({ type: 'openSettings' });
    };

    const handleStart = () => {
        vscodeApi?.postMessage({ type: 'startAIPair' });
    };

    const handleStop = () => {
        vscodeApi?.postMessage({ type: 'stopAIPair' });
    };

    const toggleWatch = () => {
        vscodeApi?.postMessage({
            type: 'updateConfig',
            key: 'autoWatch',
            value: !config?.autoWatch
        });
    };

    const handleCycleSelect = (cycle: GenerationCycleDetails) => {
        setSelectedCycle(cycle);
    };

    // Get the test results and code changes to display based on selected cycle
    const displayTestResults = selectedCycle ? selectedCycle.initialTestResults : runningState.testResults;
    const displayCodeChanges = selectedCycle ? selectedCycle.codeChanges : runningState.codeChanges;
    const displayBuildState = selectedCycle ? 
        (selectedCycle.initialBuildState || runningState.buildState) : 
        runningState.buildState;

    const displayFinalBuildState = selectedCycle?.finalBuildState;

    const onViewLogs = (logPath: string) => {
        try {
            if (!vscodeApi) {
                throw new Error('VSCode API not available');
            }
            vscodeApi.postMessage({ 
                type: 'viewLogs',
                logPath 
            });
        } catch (error) {
            console.error('Error viewing logs:', error);
        }
    };

    return (
        <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            padding: '4px'
        }}>
            <StatusBar
                status={runningState?.status || 'idle'}
                config={config}
                onToggleWatch={toggleWatch}
                onOpenSettings={openSettings}
                onStart={handleStart}
                onStop={handleStop}
            />

            {runningState && runningState.generationCycleDetails.length === 0 ? (
                <WelcomeComponent 
                    onOpenSettings={openSettings}
                    onStart={handleStart}
                />
            ) : (
                <>
                    <CycleDetails
                        cycles={runningState.generationCycleDetails}
                        selectedCycle={selectedCycle}
                        onCycleSelect={setSelectedCycle}
                    />

                    <div style={{ 
                        position: 'fixed',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        height: '250px',
                        borderTop: '1px solid var(--vscode-panel-border)',
                        background: 'var(--vscode-editor-background)'
                    }}>
                        <LogViewer 
                            logs={logs} 
                            onViewLogs={onViewLogs} 
                            config={config || undefined}
                        />
                    </div>
                </>
            )}
        </div>
    );
};

// Initialize after component definition
const vscodeApi = getVSCodeAPI();
if (!vscodeApi) {
    console.error('Failed to acquire VS Code API');
} else {
    try {
        const root = createRoot(document.getElementById('root')!);
        root.render(<Sidebar />);
    } catch (error) {
        console.error('Failed to render Sidebar:', error);
    }
} 