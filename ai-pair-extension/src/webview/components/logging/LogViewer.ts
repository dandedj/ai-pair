import { getVSCodeAPI } from '../../vscodeApi';

type LogType = 'build' | 'test';

export class LogViewer {
    private static instance: LogViewer;
    private vscodeApi = getVSCodeAPI();

    private constructor() {}

    public static getInstance(): LogViewer {
        if (!LogViewer.instance) {
            LogViewer.instance = new LogViewer();
        }
        return LogViewer.instance;
    }

    public viewLog(cycleNumber: number, isFinal: boolean, logType: LogType): void {
        this.vscodeApi?.postMessage({
            type: `view${logType.charAt(0).toUpperCase() + logType.slice(1)}Log`,
            cycleNumber,
            isFinal
        });
    }
} 