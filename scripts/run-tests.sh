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

# Change to project root directory
cd "$(dirname "$0")/.."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

# Check if npm dependencies are installed
if [ ! -d "scripts/node_modules" ]; then
    echo -e "${YELLOW}📦 Installing dependencies...${NC}"
    cd scripts && npm install && cd ..
fi

echo ""
echo -e "${BLUE}🔧 Running Node.js Module Tests${NC}"
echo "--------------------------------"
node scripts/test-modules.js

echo ""
echo -e "${BLUE}🧪 Running Unit Tests${NC}"
echo "-------------------"
cd scripts && npm test && cd ..

echo ""
echo -e "${BLUE}📊 Running Coverage Report${NC}"
echo "-------------------------"
cd scripts && npm run test:coverage && cd ..

echo ""
echo -e "${BLUE}🌐 Starting Development Server${NC}"
echo "-----------------------------"
echo "Test pages available at:"
echo "  • http://localhost:8080/scripts/test-simple.html"
echo "  • http://localhost:8080/scripts/test-editor.html"
echo "  • http://localhost:8080/scripts/debug-editor.html"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"

# Start the development server
python3 scripts/serve.py