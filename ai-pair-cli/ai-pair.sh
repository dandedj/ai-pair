#!/bin/bash
# Compile TypeScript files to JavaScript
npx tsc

# Run the AI Pair CLI program
node --no-warnings ./dist/ai-pair-cli.js "$@"