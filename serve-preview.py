#!/usr/bin/env python3
"""Local preview server with no-cache headers for fast design iteration."""
import http.server
import socketserver

PORT = 8765
HOST = "127.0.0.1"


class PreviewHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        path = self.path.split("?", 1)[0]
        if path.endswith((".html", ".css", ".js", ".jpg", ".jpeg", ".png", ".webp")) or "partial" in path:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
            self.send_header("Pragma", "no-cache")
        super().end_headers()


if __name__ == "__main__":
    with socketserver.TCPServer((HOST, PORT), PreviewHandler) as httpd:
        print(f"Preview: http://{HOST}:{PORT}/")
        print("Press Ctrl+C to stop.")
        httpd.serve_forever()
