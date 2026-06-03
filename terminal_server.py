"""Terminal API Server — replaces old Gateway /api/terminal endpoint.
Runs on port 8646. Accepts POST /api/terminal with {command: "..."} and returns stdout.
"""
import json, subprocess, os
from http.server import HTTPServer, BaseHTTPRequestHandler

class Handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path not in ('/api/terminal', '/api/wechat/qr', '/api/wechat/status'):
            self.send_json({'error': 'not found'}, 404)
            return

        length = int(self.headers.get('Content-Length', 0))
        body = json.loads(self.rfile.read(length)) if length else {}

        if self.path == '/api/terminal':
            cmd = body.get('command', '')
            if not cmd:
                self.send_json({'ok': False, 'error': 'command required'}, 400)
                return
            try:
                result = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60,
                    cwd=r'C:\Users\YF00\AppData\Local\hermes')
                self.send_json({'ok': True, 'output': result.stdout, 'stderr': result.stderr, 'exit_code': result.returncode})
            except Exception as e:
                self.send_json({'ok': False, 'error': str(e)}, 500)

        elif self.path == '/api/wechat/qr':
            # Proxy to Gateway wechat QR
            self.send_json({'ok': False, 'error': 'use Gateway /api/wechat/qr'})

        elif self.path == '/api/wechat/status':
            self.send_json({'ok': False, 'error': 'use Gateway /api/wechat/status'})

    def send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def log_message(self, *args):
        pass  # silent

if __name__ == '__main__':
    server = HTTPServer(('127.0.0.1', 8646), Handler)
    print(f'Terminal API on 127.0.0.1:8646')
    server.serve_forever()
