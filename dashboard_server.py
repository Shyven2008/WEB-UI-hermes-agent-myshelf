import json, subprocess, os, urllib.request
from http.server import HTTPServer, SimpleHTTPRequestHandler
from socketserver import ThreadingMixIn

class ThreadingHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True

GATEWAY = "http://127.0.0.1:8642"
WEB_DIR = r"C:\Users\YF00\just-hermes-agent-webui"

# Read API key from env file
_api_key = ""
try:
    with open(r"C:\Users\YF00\AppData\Local\hermes\.env") as f:
        for line in f:
            if "API_SERVER_KEY" in line and "=" in line:
                _api_key = line.strip().split("=", 1)[1]
                break
except:
    pass

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=WEB_DIR, **kwargs)

    def is_api(self):
        p = self.path.split('?')[0]
        return p.startswith('/v1/') or p.startswith('/api/') or p == '/health'

    def cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PATCH, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    def do_OPTIONS(self):
        self.send_response(200)
        self.cors()
        self.end_headers()

    def do_GET(self):
        if self.is_api():
            self.proxy('GET')
        else:
            super().do_GET()

    def do_POST(self):
        if self.path == '/api/terminal':
            self.handle_terminal()
        elif self.is_api():
            self.proxy('POST')
        else:
            self.send_error(501)

    def do_PATCH(self):
        if self.is_api():
            self.proxy('PATCH')
        else:
            self.send_error(501)

    def do_DELETE(self):
        if self.is_api():
            self.proxy('DELETE')
        else:
            self.send_error(501)

    def proxy(self, method):
        try:
            url = GATEWAY + self.path
            length = int(self.headers.get('Content-Length', 0))
            body = self.rfile.read(length) if length else None
            req = urllib.request.Request(url, data=body, method=method)
            for h in ['Content-Type', 'Authorization']:
                v = self.headers.get(h)
                if v:
                    req.add_header(h, v)
            if _api_key and not self.headers.get('Authorization'):
                req.add_header('Authorization', 'Bearer ' + _api_key)
            resp = urllib.request.urlopen(req, timeout=120)
            self.send_response(resp.status)
            self.cors()
            for h, v in resp.getheaders():
                if h.lower() not in ('access-control-allow-origin', 'transfer-encoding'):
                    self.send_header(h, v)
            self.end_headers()
            while True:
                chunk = resp.read(8192)
                if not chunk:
                    break
                self.wfile.write(chunk)
                self.wfile.flush()
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.cors()
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(502)
            self.cors()
            self.end_headers()
            self.wfile.write(json.dumps({'error': str(e)}).encode())

    def handle_terminal(self):
        try:
            length = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(length)) if length else {}
            cmd = body.get('command', '')
            if not cmd:
                self.send_json({'ok': False, 'error': 'command required'}, 400)
                return
            r = subprocess.run(cmd, shell=True, capture_output=True, text=True, timeout=60,
                cwd=r'C:\Users\YF00\AppData\Local\hermes')
            self.send_json({'ok': True, 'output': r.stdout, 'stderr': r.stderr, 'exit_code': r.returncode})
        except Exception as e:
            self.send_json({'ok': False, 'error': str(e)}, 500)

    def send_json(self, data, status=200):
        self.send_response(status)
        self.cors()
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode())

    def log_message(self, *args):
        pass

if __name__ == '__main__':
    print('Unified Dashboard on http://127.0.0.1:8650')
    ThreadingHTTPServer(('127.0.0.1', 8650), Handler).serve_forever()
