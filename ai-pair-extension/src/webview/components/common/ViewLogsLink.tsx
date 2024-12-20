import * as React from 'react';
import { getVSCodeAPI } from '../../vscodeApi';

export interface ViewLogsLinkProps {
    label: string;
    logType: 'build' | 'test' | 'generation';
    cycleNumber?: number;
    stage?: 'initial' | 'final' | 'request' | 'response';
}

export const ViewLogsLink: React.FC<ViewLogsLinkProps> = ({ label, logType, cycleNumber, stage }) => {
    const vscodeApi = React.useMemo(() => getVSCodeAPI(), []);

    const handleClick = () => {
        const messageType = `view${logType.charAt(0).toUpperCase() + logType.slice(1)}Log`;
        vscodeApi?.postMessage({
            type: messageType,
            cycleNumber,
            logType,
            stage
        });
    };

    return (
        <a 
            href="#"
            onClick={(e) => {
                e.preventDefault();
                handleClick();
            }}
            style={{
                fontSize: '11px',
                color: 'var(--vscode-textLink-foreground)',
                textDecoration: 'none',
                cursor: 'pointer'
            }}
        >
            {label}
        </a>
    );
}; 