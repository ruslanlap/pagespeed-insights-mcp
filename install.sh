#!/bin/bash

# PageSpeed Insights MCP Auto-Installation Script
# This script installs the MCP server globally and helps configure Claude Desktop

set -e

echo "🚀 Installing PageSpeed Insights MCP Server..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
NODE_MAJOR=$(echo $NODE_VERSION | cut -d'.' -f1)

if [ "$NODE_MAJOR" -lt 18 ]; then
    print_error "Node.js version 18 or higher is required. Current version: $NODE_VERSION"
    exit 1
fi

print_status "Node.js version $NODE_VERSION detected"

# Install the MCP server globally
print_info "Installing pagespeed-insights-mcp globally..."
npm install -g pagespeed-insights-mcp

print_status "MCP server installed successfully!"

# Get the global npm bin directory
NPM_BIN=$(npm bin -g)
MCP_PATH="$NPM_BIN/pagespeed-insights-mcp"

# Check if the binary exists
if [ ! -f "$MCP_PATH" ]; then
    print_warning "Binary not found at expected location. Trying alternative path..."
    MCP_PATH=$(which pagespeed-insights-mcp 2>/dev/null || echo "")
    
    if [ -z "$MCP_PATH" ]; then
        print_error "Could not find the installed MCP binary. Please check your npm global installation."
        exit 1
    fi
fi

print_status "MCP server binary located at: $MCP_PATH"

# Determine the operating system and config path
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    CONFIG_PATH="$HOME/Library/Application Support/Claude/claude_desktop_config.json"
    PLATFORM="macOS"
elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
    # Windows
    CONFIG_PATH="$APPDATA/Claude/claude_desktop_config.json"
    PLATFORM="Windows"
else
    # Linux and others
    CONFIG_PATH="$HOME/.config/claude/claude_desktop_config.json"
    PLATFORM="Linux"
fi

print_info "Detected platform: $PLATFORM"
print_info "Claude Desktop config path: $CONFIG_PATH"

# Prompt for Google API key
echo
print_info "To use this MCP server, you need a Google API key for PageSpeed Insights."
echo "Get one at: https://console.cloud.google.com/"
echo
read -p "Enter your Google API key (or press Enter to configure later): " API_KEY

# Create configuration snippet
CONFIG_SNIPPET=$(cat <<EOF
{
  "mcpServers": {
    "pagespeed-insights": {
      "command": "node",
      "args": ["$MCP_PATH"],
      "env": {
        "GOOGLE_API_KEY": "${API_KEY:-YOUR_API_KEY_HERE}"
      }
    }
  }
}
EOF
)

echo
print_status "Installation completed!"
echo
print_info "Next steps:"
echo "1. Add the following configuration to your Claude Desktop config file:"
echo "   Config file location: $CONFIG_PATH"
echo
echo "Configuration to add:"
echo "===================="
echo "$CONFIG_SNIPPET"
echo "===================="
echo

if [ -n "$API_KEY" ]; then
    print_status "Your API key has been included in the configuration above."
else
    print_warning "Remember to replace 'YOUR_API_KEY_HERE' with your actual Google API key."
fi

echo
print_info "2. Restart Claude Desktop after updating the configuration."
echo
print_info "3. You can then ask Claude to analyze websites:"
echo '   "Analyze the performance of https://example.com"'
echo
print_status "Installation guide completed!"

# Offer to create the config directory if it doesn't exist
CONFIG_DIR=$(dirname "$CONFIG_PATH")
if [ ! -d "$CONFIG_DIR" ]; then
    echo
    read -p "Claude config directory doesn't exist. Create it? (y/N): " CREATE_DIR
    if [[ $CREATE_DIR =~ ^[Yy]$ ]]; then
        mkdir -p "$CONFIG_DIR"
        print_status "Created config directory: $CONFIG_DIR"
    fi
fi

# Offer to create/update the config file
if [ -n "$API_KEY" ]; then
    echo
    read -p "Would you like to automatically update your Claude Desktop config? (y/N): " UPDATE_CONFIG
    if [[ $UPDATE_CONFIG =~ ^[Yy]$ ]]; then
        if [ -f "$CONFIG_PATH" ]; then
            # Backup existing config
            cp "$CONFIG_PATH" "$CONFIG_PATH.backup"
            print_status "Backed up existing config to $CONFIG_PATH.backup"
        fi
        
        # Create or update config
        echo "$CONFIG_SNIPPET" > "$CONFIG_PATH"
        print_status "Updated Claude Desktop configuration!"
        print_warning "Please restart Claude Desktop to apply changes."
    fi
fi