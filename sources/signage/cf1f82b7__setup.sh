#!/usr/bin/env bash
# Setup script for the Signage Rendering toolkit
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ">> Installing Python dependencies..."
python3 -m pip install --upgrade pip
python3 -m pip install -r requirements.txt

echo ">> Creating runtime directories..."
mkdir -p /home/ubuntu/generated_prompts
mkdir -p /home/ubuntu/production
mkdir -p /home/ubuntu/exports
mkdir -p "$SCRIPT_DIR/logs"

echo ">> Marking scripts executable..."
chmod +x "$SCRIPT_DIR"/*.py "$SCRIPT_DIR"/setup.sh

echo ">> Done."
echo "Try:  python3 $SCRIPT_DIR/signage_cli.py interactive"
