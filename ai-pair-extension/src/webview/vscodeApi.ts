declare global {
    interface Window {
        acquireVsCodeApi(): any;
        _vsCodeApiInstance?: any;
    }
}

let vsCodeApi: any = null;

export const getVSCodeAPI = () => {
    if (vsCodeApi) {
        console.log('Returning existing VS Code API instance');
        return vsCodeApi;
    }

    try {
        // Check if we already have an instance stored globally
        if (window._vsCodeApiInstance) {
            console.log('Using existing global VS Code API instance');
            vsCodeApi = window._vsCodeApiInstance;
        } else {
            console.log('Acquiring new VS Code API instance');
            vsCodeApi = window.acquireVsCodeApi();
            window._vsCodeApiInstance = vsCodeApi;
        }
        console.log('VS Code API instance ready:', !!vsCodeApi);
        return vsCodeApi;
    } catch (error) {
        console.error('Failed to acquire VS Code API:', error);
        return null;
    }
}; 