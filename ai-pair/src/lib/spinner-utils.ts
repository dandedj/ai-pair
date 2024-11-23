/**
 * Delays execution for the specified time.
 * @param ms - The number of milliseconds to wait.
 * @returns A promise that resolves after the specified delay.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Starts a simple console spinner.
 * @param message - The message to display with the spinner.
 * @returns The interval ID for the spinner.
 */
function startSpinner(message: string): NodeJS.Timeout {
  const spinnerChars = ['|', '/', '-', '\\'];
  let index = 0;
  process.stdout.write(message);

  return setInterval(() => {
    process.stdout.write(`\r${message} ${spinnerChars[index]}`);
    index = (index + 1) % spinnerChars.length;
  }, 100);
}

export { delay, startSpinner }; 