#!/bin/bash

# Description:
# This script runs the AIPair.js application, which is designed to assist in AI-driven code generation
# and testing for Java/Gradle projects. It allows you to specify the AI model, project root directory,
# and file extension for the source files you want to process.

# Define usage function
usage() {
    echo "Usage: $0 --model=<model> --project-root=<path> [--extension=<file_extension>]"
    echo
    echo "Description:"
    echo "  This script runs the AIPair.js application, which assists in AI-driven code generation"
    echo "  and testing for Java/Gradle projects. It allows you to specify the AI model, project root"
    echo "  directory, and file extension for the source files you want to process."
    echo
    echo "Options:"
    echo "  --model=<model>           Specify the AI model to use. Valid models are:"
    echo "                            - gpt-4o"
    echo "                            - gpt-4o-mini"
    echo "                            - gpt-3.5-turbo"
    echo "                            - claude-3-5-sonnet-20241022"
    echo "                            - claude-3-5-sonnet"
    echo "                            - gemini-1.5-pro"
    echo "                            - gemini-2"
    echo "  --project-root=<path>     Specify the root path of the project"
    echo "  --extension=<file_extension> Specify the file extension to process (default: .java)"
    echo "  -h, --help                Display this help message"
    echo
    echo "Examples:"
    echo "  $0 --model=gpt-4o --project-root=/path/to/project"
    echo "  $0 --model=gemini-2 --project-root=/path/to/project --extension=.kt"
    exit 1
}

# Check if no arguments were provided
if [ $# -eq 0 ]; then
    usage
fi

# Parse command line arguments
for i in "$@"; do
    case $i in
        --model=*)
            MODEL="${i#*=}"
            shift
            ;;
        --project-root=*)
            PROJECT_ROOT="${i#*=}"
            shift
            ;;
        --extension=*)
            EXTENSION="${i#*=}"
            shift
            ;;
        -h|--help)
            usage
            ;;
        *)
            echo "Unknown option: $i"
            usage
            ;;
    esac
done

# Check if required arguments are provided
if [ -z "$MODEL" ] || [ -z "$PROJECT_ROOT" ]; then
    echo "Error: --model and --project-root are required."
    usage
fi

# Set default extension if not provided
if [ -z "$EXTENSION" ]; then
    EXTENSION=".java"
fi

# Run the AIPair.js script with the provided arguments
node src/AIPair.js --model="$MODEL" --project-root="$PROJECT_ROOT" --extension="$EXTENSION"