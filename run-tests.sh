#!/bin/bash

# Material MAP Test Runner
echo "🧪 Material MAP Testing Suite"
echo "============================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    npm install
fi

echo ""
echo -e "${BLUE}🔧 Running Node.js Module Tests${NC}"
echo "--------------------------------"
node test-modules.js

echo ""
echo -e "${BLUE}🧪 Running Unit Tests${NC}"
echo "-------------------"
npm test

echo ""
echo -e "${BLUE}📊 Running Coverage Report${NC}"
echo "-------------------------"
npm run test:coverage

echo ""
echo -e "${BLUE}🌐 Starting Development Server${NC}"
echo "-----------------------------"
echo "Test pages available at:"
echo "  • http://localhost:8080/test-simple.html"
echo "  • http://localhost:8080/test-editor.html"
echo "  • http://localhost:8080/debug-editor.html"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

# Start the development server
python3 serve.py