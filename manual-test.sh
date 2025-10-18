#!/bin/bash

# Manual testing script for new PageSpeed Insights MCP features
# This script helps test the MCP server with Claude Desktop

echo "🧪 PageSpeed Insights MCP - Manual Testing Guide"
echo "================================================"
echo ""
echo "Prerequisites:"
echo "1. Make sure you have built the project: npm run build"
echo "2. Make sure GOOGLE_API_KEY is set in your environment"
echo "3. Update Claude Desktop config to point to this build"
echo ""
echo "Current Environment:"
echo "GOOGLE_API_KEY: ${GOOGLE_API_KEY:0:10}..." 
echo ""

# Function to test MCP server directly
test_mcp_server() {
    echo "Testing MCP server startup..."
    
    # Set timeout for the test
    timeout 5s node dist/index.js 2>&1 | while read line; do
        if [[ $line == *"PageSpeed Insights MCP server started"* ]]; then
            echo "✅ Server starts successfully"
            return 0
        fi
    done
    
    echo "⚠️  Server startup test completed"
}

# Run server test
test_mcp_server

echo ""
echo "📋 Test Checklist for Claude Desktop"
echo "===================================="
echo ""
echo "Copy and paste these commands one by one in Claude Desktop:"
echo ""
echo "1. Test Visual Analysis:"
echo "   'Get visual analysis for https://www.google.com'"
echo ""
echo "2. Test Element Analysis:"
echo "   'Show me which elements are causing performance issues on https://www.google.com'"
echo ""
echo "3. Test Network Analysis:"
echo "   'Analyze the network waterfall for https://www.google.com'"
echo ""
echo "4. Test JavaScript Analysis:"
echo "   'Get JavaScript execution breakdown for https://www.google.com'"
echo ""
echo "5. Test Image Optimization:"
echo "   'Show me which images need optimization on https://www.google.com'"
echo ""
echo "6. Test Render-Blocking Resources:"
echo "   'Find render-blocking resources on https://www.google.com'"
echo ""
echo "7. Test Third-Party Impact:"
echo "   'Analyze third-party script impact on https://www.google.com'"
echo ""
echo "8. Test Full Audit:"
echo "   'Run a full audit including accessibility and SEO for https://www.google.com'"
echo ""
echo "Expected Results for Each Test:"
echo "- Should return formatted text response"
echo "- Should include a JSON resource attachment"
echo "- Should not show any errors"
echo ""
echo "📝 Additional Test URLs to Try:"
echo "- https://www.example.com (simple site)"
echo "- https://www.youtube.com (complex site)"
echo "- https://web.dev (Google's web development site)"
echo ""

# Create a test results template
cat > test-results.md << 'EOF'
# PageSpeed Insights MCP Test Results

Date: $(date)

## Test Environment
- Node Version: $(node --version)
- NPM Version: $(npm --version)
- MCP Version: 1.1.0

## Tool Tests

### ✅/❌ get_visual_analysis
- **Test URL**: 
- **Result**: 
- **Notes**: 

### ✅/❌ get_element_analysis
- **Test URL**: 
- **Result**: 
- **Notes**: 

### ✅/❌ get_network_analysis
- **Test URL**: 
- **Result**: 
- **Notes**: 

### ✅/❌ get_javascript_analysis
- **Test URL**: 
- **Result**: 
- **Notes**: 

### ✅/❌ get_image_optimization_details
- **Test URL**: 
- **Result**: 
- **Notes**: 

### ✅/❌ get_render_blocking_details
- **Test URL**: 
- **Result**: 
- **Notes**: 

### ✅/❌ get_third_party_impact
- **Test URL**: 
- **Result**: 
- **Notes**: 

### ✅/❌ get_full_audit
- **Test URL**: 
- **Result**: 
- **Notes**: 

## Issues Found
- 

## Performance Notes
- Average response time: 
- Memory usage: 
- Any timeouts: 

EOF

echo "📄 Test results template created: test-results.md"
echo ""
echo "🚀 Ready for testing! Open Claude Desktop and try the commands above."