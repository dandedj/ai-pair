interface CodeChangeSummary {
    lastChangeTime: Date | null;
    newFiles: string[];
    deletedFiles: string[];
    modifiedFiles: string[];
    buildFiles: string[];
}

export default CodeChangeSummary;