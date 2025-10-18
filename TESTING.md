# Testing Guide for PageSpeed Insights MCP

This guide explains how to test all the features of the PageSpeed Insights MCP server.

## Prerequisites

1. Build the project first:
   ```bash
   npm run build
   ```

2. Get a Google API Key:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Enable PageSpeed Insights API
   - Create an API key

## Testing Methods

### Method 1: Automated Test Script (Recommended)

Run the automated test script that tests all tools:

```bash
# Pass API key as argument
node test-tools.js YOUR_GOOGLE_API_KEY

# Or use environment variable
export GOOGLE_API_KEY=your-api-key
node test-tools.js
```

This script will:
- Start the MCP server
- Test all 12 tools sequentially
- Show success/failure for each tool
- Display a summary at the end

Expected output:
```
🧪 Testing PageSpeed Insights MCP Tools
=====================================
API Key: AIzaSyD7mU...
✅ Server started successfully

Testing analyze_page_speed - Complete PageSpeed analysis...
✅ analyze_page_speed: SUCCESS
   - Text content: ✓
   - JSON resource: ✓

... (tests for all tools) ...

📊 Test Summary
===============
✅ Passed: 12/12
❌ Failed: 0/12
```

### Method 2: Manual Testing with Claude Desktop

1. Update your Claude Desktop config (`claude_desktop_config.json`):
   ```json
   {
     "mcpServers": {
       "pagespeed-insights": {
         "command": "node",
         "args": ["/path/to/pagespeed-insights-mcp/dist/index.js"],
         "env": {
           "GOOGLE_API_KEY": "your-google-api-key"
         }
       }
     }
   }
   ```

2. Restart Claude Desktop

3. Test each tool by typing these commands:

#### Original Tools
- `Analyze the performance of https://www.google.com`
- `Get a quick performance report for https://www.google.com`
- `Get smart recommendations for improving https://www.google.com performance`
- `Clear the cache`

#### New Tools (v1.1.0)
- `Get visual analysis for https://www.google.com`
- `Show me which elements are causing performance issues on https://www.google.com`
- `Analyze the network waterfall for https://www.google.com`
- `Get JavaScript execution breakdown for https://www.google.com`
- `Show me which images need optimization on https://www.google.com`
- `Find render-blocking resources on https://www.google.com`
- `Analyze third-party script impact on https://www.google.com`
- `Run a full audit including accessibility and SEO for https://www.google.com`

### Method 3: Direct MCP Testing

Run the manual test helper:

```bash
./manual-test.sh
```

This will:
- Show you a checklist of commands to test
- Create a test results template
- Provide guidance on expected results

## What to Look For

### ✅ Success Indicators
- Tool returns formatted text output
- JSON resource is attached with detailed data
- No error messages
- Response time is reasonable (5-15 seconds)

### ❌ Failure Indicators
- Error messages in response
- Timeout (>30 seconds)
- Missing data in response
- Server crashes

## Common Issues

1. **API Key Issues**
   - Error: "The provided API key is invalid"
   - Solution: Check your API key is correct and has PageSpeed Insights API enabled

2. **Rate Limiting**
   - Error: "Quota exceeded"
   - Solution: Wait a few minutes or use a different API key

3. **Network Issues**
   - Error: "Failed to fetch"
   - Solution: Check internet connection and firewall settings

## Testing Different URLs

Try testing with various types of websites:
- Simple: `https://www.example.com`
- Complex: `https://www.youtube.com`
- News site: `https://www.cnn.com`
- E-commerce: `https://www.amazon.com`
- Your own site

## Debugging

If a test fails, check:

1. Server logs:
   ```bash
   npm run dev  # Run in development mode for more logs
   ```

2. Check the raw API response:
   - The JSON resource attachment contains the raw data
   - Look for missing fields or unexpected structure

3. Verify the API is working:
   ```bash
   curl "https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://www.google.com&key=YOUR_API_KEY"
   ```

## Performance Testing

For performance testing:
1. Note response times for each tool
2. Check memory usage during execution
3. Test with multiple concurrent requests

## Reporting Issues

If you find issues:
1. Note which tool failed
2. Copy the error message
3. Include the test URL used
4. Check if it's reproducible

---

Happy testing! 🚀