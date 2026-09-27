#!/usr/bin/env python3
"""
THE IMPOSTOR — dev-server.py

Tiny static dev server with correct MIME types and no-cache headers.
Not required (double-clicking index.html works) but handy while iterating —
browsers apply webcam permissions more consistently over http:// than file://.

Usage:
    python3 dev-server.py [port]      # default 8000
then open http://localhost:8000
"""
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

MIME = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
    ".wasm": "application/wasm",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def guess_type(self, path):
        ext = os.path.splitext(path)[1]
        return MIME.get(ext, "application/octet-stream")

    def log_message(self, fmt, *args):
        pass  # quiet


if __name__ == "__main__":
    srv = http.server.ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"THE IMPOSTOR dev server → http://localhost:{PORT}")
    print("(no store cache; stop with Ctrl+C)")
    server_name = sys.argv[0]
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass
