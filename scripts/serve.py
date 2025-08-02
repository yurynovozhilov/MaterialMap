#!/usr/bin/env python3
"""
Simple HTTP server for Material MAP development
"""

import http.server
import socketserver
import os
import sys
from pathlib import Path

# Change to the project root directory (parent of scripts)
os.chdir(Path(__file__).parent.parent)

# Default port
PORT = 8080

# Allow port to be specified as command line argument
if len(sys.argv) > 1:
    try:
        PORT = int(sys.argv[1])
    except ValueError:
        print(f"Invalid port number: {sys.argv[1]}")
        sys.exit(1)

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

if __name__ == "__main__":
    try:
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print(f"Material MAP server running at http://localhost:{PORT}")
            print("Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48 or e.errno == 98:  # Address already in use (macOS=48, Linux=98)
            print(f"Port {PORT} is already in use. Try a different port.")
            sys.exit(1)
        else:
            raise