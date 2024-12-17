import { Config, GenerationCycleDetails, RunningState, Status } from 'ai-pair/types';
import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { CycleDetails } from './components/cycle/CycleDetails';
import { LogPanel } from './components/logging/LogPanel';
import { StatusBar } from './components/statusbar/StatusBar';
import { WelcomeComponent } from './components/WelcomeComponent';
import { getVSCodeAPI } from './vscodeApi';

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
    const [forceGeneration, setForceGeneration] = React.useState(false);
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
            console.log('Received message in webview:', message);
            
            switch (message.type) {
                case 'stateUpdate':
                    console.log('Previous state:', runningState);
                    console.log('New state:', message.state);
                    setRunningState(prevState => {
                        // Only compare status and essential fields
                        if (prevState && 
                            prevState.status === message.state.status &&
                            prevState.generationCycleDetails.length === message.state.generationCycleDetails.length) {
                            console.log('Essential state unchanged, skipping update');
                            return prevState;
                        }
                        console.log('Updating to new state:', message.state);
                        return message.state;
                    });
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
        vscodeApi?.postMessage({ 
            type: 'startAIPair',
            forceGeneration 
        });
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

    const toggleForce = () => {
        setForceGeneration(!forceGeneration);
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

    const handleToggleLog = () => {
        console.log('Toggling log, current state:', isLogExpanded);
        setIsLogExpanded(prev => !prev);
    };

    return (
        <div style={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            padding: '4px',
            paddingBottom: '30px'
        }}>
            <StatusBar
                status={runningState?.status || Status.IDLE}
                config={config}
                forceGeneration={forceGeneration}
                onToggleWatch={toggleWatch}
                onToggleForce={toggleForce}
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
                    <div style={{ 
                        padding: '8px',
                        display: 'flex',
                        gap: '8px',
                        borderBottom: '1px solid var(--vscode-panel-border)'
                    }}>
                        <input
                            type="text"
                            placeholder="Enter a hint..."
                            style={{
                                flex: 1,
                                padding: '4px 8px',
                                backgroundColor: 'var(--vscode-input-background)',
                                color: 'var(--vscode-input-foreground)',
                                border: '1px solid var(--vscode-input-border)',
                                borderRadius: '2px',
                                fontSize: '12px'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const input = e.target as HTMLInputElement;
                                    if (input.value.trim()) {
                                        vscodeApi?.postMessage({
                                            type: 'startWithHint',
                                            hint: input.value.trim(),
                                            force: true
                                        });
                                        input.value = '';
                                    }
                                }
                            }}
                        />
                        <button
                            style={{
                                padding: '4px 8px',
                                backgroundColor: 'var(--vscode-button-background)',
                                color: 'var(--vscode-button-foreground)',
                                border: 'none',
                                borderRadius: '2px',
                                cursor: 'pointer',
                                fontSize: '12px',
                                whiteSpace: 'nowrap'
                            }}
                            onClick={(e) => {
                                const input = e.currentTarget.previousSibling as HTMLInputElement;
                                if (input.value.trim()) {
                                    vscodeApi?.postMessage({
                                        type: 'startWithHint',
                                        hint: input.value.trim(),
                                        force: true
                                    });
                                    input.value = '';
                                }
                            }}
                        >
                            Generate with Hint
                        </button>
                    </div>

                    <CycleDetails
                        cycles={runningState.generationCycleDetails}
                        selectedCycle={selectedCycle}
                        onCycleSelect={setSelectedCycle}
                    />

                    <LogPanel 
                        logs={logs} 
                        onViewLogs={onViewLogs} 
                        config={config || undefined}
                        isExpanded={isLogExpanded}
                        onToggleExpand={handleToggleLog}
                    />
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