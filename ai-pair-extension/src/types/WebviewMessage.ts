export type WebviewMessage = 
    | { type: 'stateUpdate'; state: any }
    | { type: 'configUpdate'; config: any }
    | { type: 'logUpdate'; logs: string[] }
    | { type: 'viewBuildLog'; cycleNumber: number; logType: string; stage: string }
    | { type: 'viewTestLog'; cycleNumber: number; logType: string; stage: string }
    | { type: 'viewGenerationLog'; cycleNumber: number; logType: string; stage: string }
    | { type: 'viewDiff'; cycleNumber: number; filePath: string; originalPath: string }
    | { type: 'startWithHint'; hint: string }
    | { type: 'startAIPair' }
    | { type: 'stopAIPair' }
    | { type: 'openSettings' }
    | { type: 'requestLogs' }
    | { type: 'requestState' }; 