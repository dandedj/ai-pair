#!/bin/bash
# Compile TypeScript files to JavaScript
npx tsc

# Run the AI Pair CLI program
node ./dist/ai-pair-cli.js "$@"