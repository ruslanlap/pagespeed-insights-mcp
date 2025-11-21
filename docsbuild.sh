#!/bin/bash

# Activate virtual environment
source .venv/bin/activate

# Build the documentation
mkdocs build

echo "Documentation built successfully in site/ directory"
