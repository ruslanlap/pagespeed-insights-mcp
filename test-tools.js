#!/usr/bin/env node

/**
 * Test script for PageSpeed Insights MCP tools
 * Tests all available tools including the new v1.1.0 features
 */

import { spawn } from 'child_process';
import { createInterface } from 'readline';

// Get API key from command line or environment
const apiKey = process.argv[2] || process.env.GOOGLE_API_KEY;

if (!apiKey) {
  console.error('❌ Error: Google API key is required');
  console.log('\nUsage:');
  console.log('  node test-all-new-tools.js YOUR_API_KEY');
  console.log('  OR');
  console.log('  export GOOGLE_API_KEY=your-api-key');
  console.log('  node test-all-new-tools.js');
  process.exit(1);
}

console.log('🧪 Testing PageSpeed Insights MCP Tools');
console.log('=====================================');
console.log(`API Key: ${apiKey.substring(0, 10)}...`);
console.log('');

// Start the MCP server
const server = spawn('node', ['dist/index.js'], {
  env: {
    ...process.env,
    GOOGLE_API_KEY: apiKey
  }
});

// Track test results
let testResults = [];
let currentTest = null;

// Create readline interface for server's stdout
const rl = createInterface({
  input: server.stdout,
  crlfDelay: Infinity
});

// Listen for server output
rl.on('line', (line) => {
  try {
    const json = JSON.parse(line);
    if (json.result && currentTest) {
      console.log(`✅ ${currentTest.name}: SUCCESS`);
      
      // Check if result has expected structure
      if (json.result.content && Array.isArray(json.result.content)) {
        const hasText = json.result.content.some(c => c.type === 'text');
        const hasResource = json.result.content.some(c => c.type === 'resource');
        console.log(`   - Text content: ${hasText ? '✓' : '✗'}`);
        console.log(`   - JSON resource: ${hasResource ? '✓' : '✗'}`);
      }
      
      testResults.push({ ...currentTest, success: true });
      currentTest = null;
    } else if (json.error && currentTest) {
      console.log(`❌ ${currentTest.name}: FAILED - ${json.error.message}`);
      testResults.push({ ...currentTest, success: false, error: json.error.message });
      currentTest = null;
    }
  } catch (e) {
    // Not JSON, could be server startup messages
    if (line.includes('PageSpeed Insights MCP server started')) {
      console.log('✅ Server started successfully');
      console.log('');
    }
  }
});

// Error handling
server.stderr.on('data', (data) => {
  const error = data.toString();
  if (!error.includes('Debugger listening')) {
    console.error('Server error:', error);
  }
});

// Define all tools to test
const toolsToTest = [
  // Original tools
  {
    name: 'analyze_page_speed',
    description: 'Complete PageSpeed analysis',
    params: {
      name: 'analyze_page_speed',
      arguments: {
        url: 'https://www.google.com',
        strategy: 'mobile'
      }
    }
  },
  {
    name: 'get_performance_summary',
    description: 'Performance summary',
    params: {
      name: 'get_performance_summary',
      arguments: {
        url: 'https://www.google.com',
        strategy: 'mobile'
      }
    }
  },
  {
    name: 'get_recommendations',
    description: 'Smart recommendations',
    params: {
      name: 'get_recommendations',
      arguments: {
        url: 'https://www.google.com',
        strategy: 'mobile'
      }
    }
  },
  
  // New tools
  {
    name: 'get_visual_analysis',
    description: 'Visual analysis (screenshots)',
    params: {
      name: 'get_visual_analysis',
      arguments: {
        url: 'https://www.google.com',
        strategy: 'mobile'
      }
    }
  },
  {
    name: 'get_element_analysis',
    description: 'Element-level analysis',
    params: {
      name: 'get_element_analysis',
      arguments: {
        url: 'https://www.google.com',
        strategy: 'mobile'
      }
    }
  },
  {
    name: 'get_network_analysis',
    description: 'Network waterfall',
    params: {
      name: 'get_network_analysis',
      arguments: {
        url: 'https://www.google.com',
        strategy: 'mobile'
      }
    }
  },
  {
    name: 'get_javascript_analysis',
    description: 'JavaScript execution',
    params: {
      name: 'get_javascript_analysis',
      arguments: {
        url: 'https://www.google.com',
        strategy: 'mobile'
      }
    }
  },
  {
    name: 'get_image_optimization_details',
    description: 'Image optimization',
    params: {
      name: 'get_image_optimization_details',
      arguments: {
        url: 'https://www.google.com',
        strategy: 'mobile'
      }
    }
  },
  {
    name: 'get_render_blocking_details',
    description: 'Render-blocking resources',
    params: {
      name: 'get_render_blocking_details',
      arguments: {
        url: 'https://www.google.com',
        strategy: 'mobile'
      }
    }
  },
  {
    name: 'get_third_party_impact',
    description: 'Third-party impact',
    params: {
      name: 'get_third_party_impact',
      arguments: {
        url: 'https://www.google.com',
        strategy: 'mobile'
      }
    }
  },
  {
    name: 'get_full_audit',
    description: 'Full audit (all categories)',
    params: {
      name: 'get_full_audit',
      arguments: {
        url: 'https://www.google.com',
        strategy: 'mobile',
        categories: ['performance', 'accessibility', 'seo', 'best-practices']
      }
    }
  },
  {
    name: 'clear_cache',
    description: 'Clear cache',
    params: {
      name: 'clear_cache',
      arguments: {}
    }
  }
];

// Wait for server to start, then run tests
setTimeout(async () => {
  console.log('Running tests...\n');
  
  // Send initialization
  server.stdin.write(JSON.stringify({
    jsonrpc: '2.0',
    id: 'init',
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0.0' }
    }
  }) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Run each test with a delay between them
  for (let i = 0; i < toolsToTest.length; i++) {
    const test = toolsToTest[i];
    currentTest = test;
    
    console.log(`\nTesting ${test.name} - ${test.description}...`);
    
    const request = {
      jsonrpc: '2.0',
      id: `test-${i}`,
      method: 'tools/call',
      params: test.params
    };
    
    server.stdin.write(JSON.stringify(request) + '\n');
    
    // Wait for response (adjust timing based on tool)
    const waitTime = test.name === 'get_full_audit' ? 10000 : 5000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  // Print summary
  console.log('\n\n📊 Test Summary');
  console.log('===============');
  
  const passed = testResults.filter(r => r.success).length;
  const failed = testResults.filter(r => !r.success).length;
  
  console.log(`✅ Passed: ${passed}/${toolsToTest.length}`);
  console.log(`❌ Failed: ${failed}/${toolsToTest.length}`);
  
  if (failed > 0) {
    console.log('\nFailed tests:');
    testResults.filter(r => !r.success).forEach(r => {
      console.log(`- ${r.name}: ${r.error || 'Unknown error'}`);
    });
  }
  
  // Close the server
  console.log('\nTests completed, closing server');
  server.kill();
  process.exit(failed > 0 ? 1 : 0);
}, 2000);