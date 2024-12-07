import * as React from 'react';
import { componentStyles } from '../styles/components';
import { vscodeStyles } from '../styles/vscode';

// Model families from AI client factory
const modelFamilies = [
    'gpt-4o',
    'gpt-4o-mini',
    'gpt-3.5-turbo',
    'o1-preview',
    'o1-mini',
    'claude-3-5-sonnet',
    'claude-3-haiku',
    'gemini-2',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-1.0-pro',
    'gemini-exp-1114',
    'gemini-exp-1121',
    'gemini-1.5-flash-latest',
    'gemini-1.5-pro-latest',
    'gemini-1.0-pro-latest'
];

interface SettingsPanelProps {
    config: {
        model: string;
        extension: string;
        srcDir: string;
        testDir: string;
        anthropicApiKey?: string;
        openaiApiKey?: string;
        geminiApiKey?: string;
        logLevel: string;
        numRetries: number;
    };
    onSave: (config: any) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ config, onSave }) => {
    const [formData, setFormData] = React.useState(config);

    const handleChange = (key: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [key]: value
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    // Helper function to format model name for display
    const formatModelName = (model: string): string => {
        return model
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ')
            .replace('Gpt', 'GPT')
            .replace('O1', 'O1')
            .replace('Pro Latest', 'Pro (Latest)')
            .replace('Flash Latest', 'Flash (Latest)');
    };

    return (
        <form onSubmit={handleSubmit} style={vscodeStyles.container}>
            <div style={componentStyles.panel}>
                <div style={componentStyles.panelHeader}>
                    <h3 style={componentStyles.panelTitle}>Model Settings</h3>
                </div>
                <div style={{ padding: '12px' }}>
                    <div style={vscodeStyles.formGroup}>
                        <label style={vscodeStyles.label}>Model:</label>
                        <select
                            style={vscodeStyles.select}
                            value={formData.model}
                            onChange={e => handleChange('model', e.target.value)}
                        >
                            {modelFamilies.map(model => (
                                <option key={model} value={model}>
                                    {formatModelName(model)}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            <div style={componentStyles.panel}>
                <div style={componentStyles.panelHeader}>
                    <h3 style={componentStyles.panelTitle}>API Keys</h3>
                </div>
                <div style={{ padding: '12px' }}>
                    <div style={vscodeStyles.formGroup}>
                        <label style={vscodeStyles.label}>OpenAI API Key:</label>
                        <input
                            type="password"
                            style={vscodeStyles.input}
                            value={formData.openaiApiKey || ''}
                            onChange={e => handleChange('openaiApiKey', e.target.value)}
                        />
                    </div>
                    <div style={vscodeStyles.formGroup}>
                        <label style={vscodeStyles.label}>Anthropic API Key:</label>
                        <input
                            type="password"
                            style={vscodeStyles.input}
                            value={formData.anthropicApiKey || ''}
                            onChange={e => handleChange('anthropicApiKey', e.target.value)}
                        />
                    </div>
                    <div style={vscodeStyles.formGroup}>
                        <label style={vscodeStyles.label}>Gemini API Key:</label>
                        <input
                            type="password"
                            style={vscodeStyles.input}
                            value={formData.geminiApiKey || ''}
                            onChange={e => handleChange('geminiApiKey', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div style={componentStyles.panel}>
                <div style={componentStyles.panelHeader}>
                    <h3 style={componentStyles.panelTitle}>Project Settings</h3>
                </div>
                <div style={{ padding: '12px' }}>
                    <div style={vscodeStyles.formGroup}>
                        <label style={vscodeStyles.label}>File Extension:</label>
                        <input
                            type="text"
                            style={vscodeStyles.input}
                            value={formData.extension}
                            onChange={e => handleChange('extension', e.target.value)}
                        />
                    </div>
                    <div style={vscodeStyles.formGroup}>
                        <label style={vscodeStyles.label}>Source Directory:</label>
                        <input
                            type="text"
                            style={vscodeStyles.input}
                            value={formData.srcDir}
                            onChange={e => handleChange('srcDir', e.target.value)}
                        />
                    </div>
                    <div style={vscodeStyles.formGroup}>
                        <label style={vscodeStyles.label}>Test Directory:</label>
                        <input
                            type="text"
                            style={vscodeStyles.input}
                            value={formData.testDir}
                            onChange={e => handleChange('testDir', e.target.value)}
                        />
                    </div>
                </div>
            </div>

            <div style={componentStyles.panel}>
                <div style={componentStyles.panelHeader}>
                    <h3 style={componentStyles.panelTitle}>Advanced Settings</h3>
                </div>
                <div style={{ padding: '12px' }}>
                    <div style={vscodeStyles.formGroup}>
                        <label style={vscodeStyles.label}>Log Level:</label>
                        <select
                            style={vscodeStyles.select}
                            value={formData.logLevel}
                            onChange={e => handleChange('logLevel', e.target.value)}
                        >
                            <option value="debug">Debug</option>
                            <option value="info">Info</option>
                            <option value="warn">Warning</option>
                            <option value="error">Error</option>
                        </select>
                    </div>
                    <div style={vscodeStyles.formGroup}>
                        <label style={vscodeStyles.label}>Number of Retries:</label>
                        <input
                            type="number"
                            style={vscodeStyles.input}
                            value={formData.numRetries}
                            onChange={e => handleChange('numRetries', parseInt(e.target.value))}
                        />
                    </div>
                </div>
            </div>

            <div style={{ marginTop: '16px' }}>
                <button type="submit" style={vscodeStyles.button}>
                    Save Settings
                </button>
            </div>
        </form>
    );
}; 