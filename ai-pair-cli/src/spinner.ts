const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function startSpinner(message: string): NodeJS.Timeout {
    let i = 0;
    process.stdout.write('\x1B[?25l'); // Hide cursor

    const spinner = setInterval(() => {
        const frame = spinnerFrames[i = ++i % spinnerFrames.length];
        process.stdout.write(`\r${frame} ${message}`);
    }, 80);

    return spinner;
}

export function stopSpinner(spinner: NodeJS.Timeout): void {
    clearInterval(spinner);
    process.stdout.write('\r\x1B[K'); // Clear line
    process.stdout.write('\x1B[?25h'); // Show cursor
}

export async function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
} 