#!/usr/bin/env node

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  env: {
    ...process.env,
    GOOGLE_API_KEY: 'AIzaSjAD7mURoGVIUcFcAizg' // Replace with your actual API key
  }
});

// Create readline interface for server's stdout
const rl = createInterface({
  input: server.stdout,
  crlfDelay: Infinity
});

// Listen for server output
rl.on('line', (line) => {
  console.log('Server output:', line);
});

// Error handling
server.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// Wait for server to start
setTimeout(() => {
  // Test the analyze_page_speed tool
  const analyzeRequest = {
    jsonrpc: '2.0',
    id: '1',
    method: 'callTool',
    params: {
      name: 'analyze_page_speed',
      arguments: {
        url: 'https://example.com',
        strategy: 'mobile'
      }
    }
  };

  // Send the request to the server
  server.stdin.write(JSON.stringify(analyzeRequest) + '\n');
  
  // Test the get_performance_summary tool after a delay
  setTimeout(() => {
    const summaryRequest = {
      jsonrpc: '2.0',
      id: '2',
      method: 'callTool',
      params: {
        name: 'get_performance_summary',
        arguments: {
          url: 'https://example.com',
          strategy: 'mobile'
        }
      }
    };
    
    server.stdin.write(JSON.stringify(summaryRequest) + '\n');
    
    // Close the server after tests
    setTimeout(() => {
      console.log('Tests completed, closing server');
      server.kill();
      process.exit(0);
    }, 5000);
  }, 5000);
}, 2000);
