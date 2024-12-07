import 'dotenv/config';
import path from 'path';
import { loadCommandLineConfig } from './config-loader';
import { clearDirectory, loadPrompts } from 'ai-pair';
import { AIPair, Config, RunningState } from 'ai-pair';
import pino from 'pino';
import readline from 'readline-sync';
import chokidar from 'chokidar';
import { startSpinner, stopSpinner} from './spinner';

class AIPairCLI {
  private runner: AIPair;
  private config: Config;
  private runningState: RunningState;
  private cliLogger: pino.Logger;

  constructor(config: Config, runningState: RunningState) {
    this.config = config;
    this.runningState = runningState;
    this.runner = new AIPair(config, runningState);
    this.cliLogger = pino({
      level: config.logLevel,
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    });
  }

  async runWithInteraction(): Promise<void> {
    this.cliLogger.info(`Starting AI Pair Runner with model: ${this.config.model}`);

    if (!this.runningState) {
      this.cliLogger.debug('RunningState is not initialized, initializing...');
      this.runningState = new RunningState();
    }

    this.runningState.generationCycles = 0;
    let exit = false;
    let hint = '';

    while (!exit) {
      console.log('\nSelect an action:');
      console.log('c or [enter]- Continue and force code generation');
      console.log('w - Watch code files for changes');
      console.log('h - Provide a hint');
      console.log('x or e - Exit');
      const action = readline.question('Enter your choice: ');

      switch (action.toLowerCase()) {
        case 'c':
        case '': {
          console.log('Forcing code generation...');
          const genSpinner = startSpinner('Generating code');
          try {
            await this.runner.performCodeGenerationCyclesWithRetries(true);
          } finally {
            stopSpinner(genSpinner);
          }
          break;
        }
        case 'w':
          console.log('Starting to watch for file changes...');
          await this.watchForChanges();
          break;
        case 'h': {
          hint = readline.question('Enter your hint: ');
          this.runningState.addHint(hint);
          const hintSpinner = startSpinner('Processing hint');
          try {
            await this.runner.performCodeGenerationCyclesWithRetries(true);
          } finally {
            stopSpinner(hintSpinner);
          }
          break;
        }
        case 'x':
        case 'e':
          console.log('Exiting AI Pair Runner.');
          exit = true;
          break;
        default:
          console.log('Invalid choice. Please try again.');
      }
    }
  }

  async watchForChanges(): Promise<void> {
    this.cliLogger.info('Watching for file changes...');
    return new Promise<void>(() => {
      const srcDirPath = path.resolve(this.config.srcDir);
      const testDirPath = path.resolve(this.config.testDir);

      this.cliLogger.debug(`Source directory being watched: ${srcDirPath}`);
      this.cliLogger.debug(`Test directory being watched: ${testDirPath}`);

      this.runningState.generationCycles = 0;
      this.runningState.resetCycleState();

      const watcher = chokidar.watch([srcDirPath, testDirPath], {
        persistent: true,
        ignoreInitial: true,
      });

      watcher.on('ready', () => {
        this.cliLogger.debug('Initial scan complete. Ready for changes.');
        const watchedPaths = watcher.getWatched();
        for (const dir in watchedPaths) {
          watchedPaths[dir].forEach((file) => {
            this.cliLogger.debug(`Watching: ${path.join(dir, file)}`);
          });
        }
      });

      watcher.on('change', async (filePath) => {
        this.cliLogger.debug(`File changed: ${filePath}`);
        const spinner = startSpinner('Processing file changes');
        try {
          await this.runner.performCodeGenerationCyclesWithRetries();
        } finally {
          stopSpinner(spinner);
        }
      });

      watcher.on('add', async (filePath) => {
        this.cliLogger.debug(`File added: ${filePath}`);
        const spinner = startSpinner('Processing new file');
        try {
          await this.runner.performCodeGenerationCyclesWithRetries();
        } finally {
          stopSpinner(spinner);
        }
      });

      watcher.on('unlink', async (filePath) => {
        this.cliLogger.debug(`File removed: ${filePath}`);
        const spinner = startSpinner('Processing file removal');
        try {
          await this.runner.performCodeGenerationCyclesWithRetries();
        } finally {
          stopSpinner(spinner);
        }
      });

      watcher.on('error', (error) => {
        this.cliLogger.error(`Watcher error: ${error}`);
      });
    });
  }
}

(async () => {
  try {
    // Load configuration data asynchronously
    const configData = await loadCommandLineConfig();

    // Set default log level to 'debug' if not specified
    configData.logLevel = configData.logLevel || 'debug';

    // Resolve tmpDir to an absolute path
    configData.tmpDir = path.resolve(configData.tmpDir);

    const config = new Config(configData);
    
    const prompts = loadPrompts(config.promptsPath);
    config.systemPrompt = prompts.systemPrompt;
    config.promptTemplate = prompts.promptTemplate;
    config.noIssuePromptTemplate = prompts.noIssuePromptTemplate;
    
    const runningState = new RunningState();

    // Clear temporary directories
    clearDirectory(config.tmpDir);

    const cli = new AIPairCLI(config, runningState);
    await cli.runWithInteraction();
  } catch (error) {
    console.error('Failed to run AI Pair:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
})(); 