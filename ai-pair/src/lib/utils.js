/**
 * Delays execution for the specified time.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>}
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Starts a simple console spinner.
 * @param {string} message - The message to display with the spinner.
 * @returns {NodeJS.Timeout} - The interval ID for the spinner.
 */
function startSpinner(message) {
  const spinnerChars = ['|', '/', '-', '\\'];
  let index = 0;
  process.stdout.write(message);

  return setInterval(() => {
    process.stdout.write(`\r${message} ${spinnerChars[index]}`);
    index = (index + 1) % spinnerChars.length;
  }, 100);
}

module.exports = {
  delay,
  startSpinner,
}; 