#!/bin/bash

# PDF Editor - Initialization Script
# This script sets up and starts the development environment

echo "🚀 Starting PDF Editor Development Environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"

# Function to check if a port is in use
check_port() {
    if lsof -Pi :$1 -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Kill any existing processes on ports 3000 and 3001
if check_port 3000; then
    echo "🔄 Stopping existing process on port 3000..."
    lsof -ti:3000 | xargs kill -9 2>/dev/null || true
fi

if check_port 3001; then
    echo "🔄 Stopping existing process on port 3001..."
    lsof -ti:3001 | xargs kill -9 2>/dev/null || true
fi

# Wait a moment for ports to be released
sleep 2

# Start backend server
echo ""
echo "📦 Starting backend server on port 3001..."
cd backend
if [ ! -d "node_modules" ]; then
    echo "📥 Installing backend dependencies..."
    npm install
fi

npm start > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend server started (PID: $BACKEND_PID)"
cd ..

# Wait for backend to start
echo "⏳ Waiting for backend to be ready..."
sleep 3

# Start frontend server
echo ""
echo "🎨 Starting frontend server on port 3000..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "📥 Installing frontend dependencies..."
    npm install
fi

# Set environment variable to avoid browser auto-opening
export BROWSER=none

npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend server started (PID: $FRONTEND_PID)"
cd ..

# Wait for frontend to start
echo "⏳ Waiting for frontend to be ready..."
sleep 5

echo ""
echo "✨ PDF Editor is now running!"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:3001"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f backend.log"
echo "   Frontend: tail -f frontend.log"
echo ""
echo "🛑 To stop the servers, run: pkill -f 'node.*server.js' && pkill -f 'vite'"
echo ""

# Keep script running and show logs
echo "📊 Monitoring servers (Ctrl+C to exit monitoring, servers will continue running)..."
echo ""
tail -f backend.log frontend.log
