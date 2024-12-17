# AI Pair Programmer Extension

## Overview

The AI Pair Programmer Extension is a powerful tool for Visual Studio Code that facilitates AI-assisted pair programming. This extension helps you collaborate with AI to write, debug, and refine code efficiently, ensuring that all generated code passes your test suite.

## Key Features

* **Test-Focused Code Generation**: Unlike typical AI tools, this extension prioritizes producing code that passes your tests.
* **Iterative Refinement**: It works in cycles to identify and resolve issues until the build and tests succeed.
* **Customizable Settings**: Choose from popular AI models and configure retry limits and escalation preferences.

## How to Use the Extension

1. **Open a Project**: Begin by opening a folder in VS Code containing your project files.
2. **Launch the Extension**: Access the AI Pair Programmer extension from the sidebar or use the `<span>ai-pair.start</span>` command in the Command Palette.
3. **Start a Session**: Click the **Play** button to initiate a pair programming session.

### The Cycle Workflow

The extension operates in a sequence of phases:

* **Building**: Compiles the code.
* **Testing**: Runs the test suite to identify failures.
* **Generating Code**: Suggests code changes to address issues.
* **Rebuilding**: Recompiles the updated code.
* **Retesting**: Verifies the updates against the test suite.
* **Completed**: Marks the end of a successful cycle.

You can stop the session at any time by clicking the **Stop** button. The extension will finish the current phase before halting.

### Retry Mechanism

The extension automatically retries until:

* All builds and tests pass, or
* The configured maximum number of retries is reached.

## Monitoring Progress

### Sidebar Interface

The extension sidebar provides real-time progress tracking:

* Each cycle is represented as a row in a table.
* Expand any cycle to view detailed results, including:
  * Compilation status
  * Test outcomes
  * Generated code changes
  * Timing metrics
* Access logs for specific phases by clicking the **View Logs** link, which opens a detailed log view in a new tab.

## Model Selection and Configuration

You can select and configure AI models for the extension:

* Supported models include OpenAI, Anthropic, and Google.
* Access settings through the **AI Pair Settings** section in VS Code or the extension’s settings menu.
* Input the API key from your model provider to activate the chosen model.

## Advanced Features

### Code Generation Hints

Guide the AI by providing hints in the "Generate Code" section. Even when the build and tests pass, these hints can trigger additional code suggestions tailored to your input.

### Escalation Mechanism

For challenging scenarios, the extension can escalate to a more capable (and often more expensive) model during the final retry cycle. This ensures the best possible outcome when simpler models fail to meet expectations.

---

The AI Pair Programmer Extension streamlines your development process by emphasizing code quality and providing flexible, user-friendly features for enhanced productivity

## Overview

This extension is a VS Code extension that allows you to use the AI Pair Programmer extension to pair program with AI.

## Features

AI pair is designed to be pair programmer that will use your test suite to generate code changes. Typical AI tools will generate code that may not pass your tests. AI pair will generate code that passes your tests.

## How to use

1. Open a folder in VS Code
2. Open the AI Pair extension
3. Click the Play button to start a new pair programming session (or alternatively you can use the `ai-pair.start` command from the vscode command palette)

The extension will run a number of cycles to generate code changes. Each cycle will several phases: `Building`, `Testing`, `Generating Code`, `Rebuilding`, `Retesting`, and `Completed` (in those orders).

At any point in the cycle you can click the `Stop` button to stop the cycle. It will finish the current phase and then stop.

On each cycle, the extension will first build and test to see if any changes are needed. If the build or tests fail, it will generate code changes to fix the build or tests. It will then rebuild and retest until the build and tests pass.

If the build and tests pass then it will stop the cycle.

The extension will continue to run cycles until it reaches the maximum number of retries or the build and tests pass. Retries can be configured in the settings.

## Viewing the results

You can see the progress and results of the AI Pair programmer by opening the sidebar. The sidebar shows a table where each cycle is represented as a row. You can expand any cycle to see the results from that cycle. When a cycle is expanded, you can see the results from each phase of the cycle including the compilation state, test results, code changes, and timing details.

You can also view the logs for parts of a cycle by clicking the `View Logs` link in the cycle details for the phase you are interested in. This will open a new tab with the logs for the cycle.

## Choosing the model

The extension will use the model you have selected in the settings. You can change the model by clicking the `Settings` button in the extension or by navigating to the `AI Pair Settings` section in the VS Code settings.

The extension supports most popular models including OpenAI, Anthropic, and Google. The extension requires a `apiKey` for the model you are using. You can get an API key from the model provider's website.

## Forcing

Even if the build and tests pass, you can force the extension to generate code changes by entering a hint in the `Generate Code` section. This will generate code changes (using your hint as a guide) and then rebuild and retest until the build and tests pass.

## Escalation

The extension can be configured to escalate to a more expensive model on the last cycle. This can be helpful if other models have failed to generate code that passes the tests.
