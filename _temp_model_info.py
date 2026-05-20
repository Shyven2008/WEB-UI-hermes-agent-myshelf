import json, sys
data = json.loads(sys.stdin.read())
for m in data.get('data', []):
    if m.get('id') == 'qwen/qwen3-coder:free':
        print(json.dumps(m, indent=2))
        break
