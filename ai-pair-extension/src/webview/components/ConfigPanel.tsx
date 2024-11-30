import * as React from 'react';
import { componentStyles as cStyles } from '../styles/components';
import { vscodeStyles as vStyles } from '../styles/vscode';

interface ConfigPanelProps {
    config: {
        apiKey: string;
        model: string;
        autoWatch: boolean;
    };
    onConfigChange: (key: string, value: any) => void;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onConfigChange }) => {
    return (
        <div style={cStyles.panel}>
            <div style={cStyles.panelHeader}>
                <h3 style={cStyles.panelTitle}>Configuration</h3>
            </div>
            <div style={vStyles.formGroup}>
                <div style={vStyles.labelContainer}>API Key:</div>
                <input
                    type="password"
                    style={vStyles.input}
                    value={config.apiKey}
                    onChange={e => onConfigChange('apiKey', e.target.value)}
                />
            </div>
        </div>
    );
}; 