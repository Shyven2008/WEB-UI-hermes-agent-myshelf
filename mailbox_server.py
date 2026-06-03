#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mailbox 服务 - Proma 架构的调度队列后端
端口: 8648
API:
  GET    /list          - 获取所有任务 (?status=pending|running|done)
  GET    /task/:id      - 获取单个任务
  POST   /enqueue       - 提交新任务
  POST   /dequeue       - Worker 拉取下一个待处理任务
  POST   /ack           - 回传结果并标记完成
  POST   /start         - 手动启动任务 (pending→running, 检查并发上限)
  POST   /pause         - 暂停任务 (running→pending, 释放并发槽)
  POST   /delete        - 删除任务
"""

import json
import os
import sys
import time
import uuid
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# 配置
PORT = 8648
DATA_DIR = os.path.expanduser('~/.justpost')
DATA_FILE = os.path.join(DATA_DIR, 'mailbox.json')
MAX_CONCURRENT = 3  # 人类注意力上限

# 确保数据目录存在
os.makedirs(DATA_DIR, exist_ok=True)


def load_data():
    if not os.path.exists(DATA_FILE):
        return {"tasks": []}
    try:
        with open(DATA_FILE, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[WARN] 加载数据失败，创建新文件: {e}", file=sys.stderr)
        return {"tasks": []}


def save_data(data):
    with open(DATA_FILE, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def next_id():
    return str(uuid.uuid4())[:8]


class MailboxHandler(BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def _send_json(self, data, status=200):
        self.send_response(status)
        self._send_cors()
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def _read_json(self):
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length)
        if not body:
            return {}
        try:
            return json.loads(body.decode('utf-8'))
        except Exception:
            return {}

    def log_message(self, format, *args):
        # 精简日志
        print(f"[{time.strftime('%H:%M:%S')}] {args[0]}", file=sys.stderr)

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        data = load_data()

        if path == '/list':
            qs = parse_qs(parsed.query)
            status = qs.get('status', [None])[0]
            tasks = data['tasks']
            if status:
                tasks = [t for t in tasks if t.get('status') == status]
            # 按创建时间倒序
            tasks = sorted(tasks, key=lambda t: t.get('createdAt', 0), reverse=True)
            self._send_json({"tasks": tasks})
            return

        if path.startswith('/task/'):
            task_id = path.split('/')[-1]
            task = next((t for t in data['tasks'] if t['id'] == task_id), None)
            if task:
                self._send_json(task)
            else:
                self._send_json({"error": "Task not found"}, 404)
            return

        self._send_json({"error": "Not found"}, 404)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path

        body = self._read_json()

        if path == '/enqueue':
            data = load_data()
            task = {
                "id": next_id(),
                "title": body.get('title', 'untitled'),
                "desc": body.get('desc', ''),
                "priority": body.get('priority', 'P2'),
                "workspace": body.get('workspace', 'general'),
                "taskType": body.get('taskType', 'manual'),  # manual | agent
                "status": "pending",
                "createdAt": int(time.time() * 1000),
                "startedAt": None,
                "finishedAt": None,
                "result": None,
                "agentLog": None,
                "steps": body.get('steps', []),         # 子步骤拆分
                "currentStep": 0,
                "waitingConfirmation": False,            # trae.ai: 暂停等待用户确认
                "topicId": body.get('topicId', None),      # 关联话题追踪
                "source": body.get('source', 'manual')      # 任务来源: manual | topic_tracker
            }
            data['tasks'].append(task)
            save_data(data)
            self._send_json({"ok": True, "task": task})
            return

        if path == '/dequeue':
            data = load_data()
            running = [t for t in data['tasks'] if t.get('status') == 'running']
            if len(running) >= MAX_CONCURRENT:
                self._send_json({"ok": False, "reason": "max concurrent reached", "current": len(running)})
                return
            pending = [t for t in data['tasks'] if t.get('status') == 'pending']
            if not pending:
                self._send_json({"ok": False, "reason": "no pending tasks"})
                return
            priority_order = {'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3}
            pending.sort(key=lambda t: (priority_order.get(t.get('priority'), 99), t.get('createdAt', 0)))
            task = pending[0]
            task['status'] = 'running'
            task['startedAt'] = int(time.time() * 1000)
            save_data(data)
            self._send_json({"ok": True, "task": task})
            return

        if path == '/ack':
            task_id = body.get('taskId')
            result = body.get('result', '')
            agent_log = body.get('agentLog', '')
            waiting = body.get('waitingConfirmation', False)
            current_step = body.get('currentStep')

            if not task_id:
                self._send_json({"ok": False, "error": "taskId required"}, 400)
                return
            data = load_data()
            task = next((t for t in data['tasks'] if t['id'] == task_id), None)
            if not task:
                self._send_json({"ok": False, "error": "task not found"}, 404)
                return

            # trae.ai 分步预览：中间步骤完成后暂停等待确认
            if waiting:
                task['waitingConfirmation'] = True
                if current_step is not None:
                    task['currentStep'] = current_step
                task['result'] = result
                task['agentLog'] = agent_log
            else:
                task['status'] = 'done'
                task['finishedAt'] = int(time.time() * 1000)
                task['result'] = result
                task['agentLog'] = agent_log

            save_data(data)
            self._send_json({"ok": True, "task": task})
            return

        # --- 新增端点 ---

        if path == '/start':
            task_id = body.get('taskId')
            if not task_id:
                self._send_json({"ok": False, "error": "taskId required"}, 400)
                return
            data = load_data()
            task = next((t for t in data['tasks'] if t['id'] == task_id), None)
            if not task:
                self._send_json({"ok": False, "error": "task not found"}, 404)
                return
            if task.get('status') != 'pending':
                self._send_json({"ok": False, "error": f"task is {task.get('status')}, not pending"}, 400)
                return
            running = [t for t in data['tasks'] if t.get('status') == 'running']
            if len(running) >= MAX_CONCURRENT:
                self._send_json({"ok": False, "reason": "max concurrent reached", "current": len(running)})
                return
            task['status'] = 'running'
            task['startedAt'] = int(time.time() * 1000)
            save_data(data)
            self._send_json({"ok": True, "task": task})
            return

        if path == '/pause':
            task_id = body.get('taskId')
            if not task_id:
                self._send_json({"ok": False, "error": "taskId required"}, 400)
                return
            data = load_data()
            task = next((t for t in data['tasks'] if t['id'] == task_id), None)
            if not task:
                self._send_json({"ok": False, "error": "task not found"}, 404)
                return
            if task.get('status') != 'running':
                self._send_json({"ok": False, "error": f"task is {task.get('status')}, not running"}, 400)
                return
            task['status'] = 'pending'
            task['startedAt'] = None
            save_data(data)
            self._send_json({"ok": True, "task": task})
            return

        if path == '/delete':
            task_id = body.get('taskId')
            if not task_id:
                self._send_json({"ok": False, "error": "taskId required"}, 400)
                return
            data = load_data()
            task = next((t for t in data['tasks'] if t['id'] == task_id), None)
            if not task:
                self._send_json({"ok": False, "error": "task not found"}, 404)
                return
            data['tasks'] = [t for t in data['tasks'] if t['id'] != task_id]
            save_data(data)
            self._send_json({"ok": True, "deleted": task_id})
            return

        # --- /continue: 用户确认后继续执行下一步 ---
        if path == '/continue':
            task_id = body.get('taskId')
            if not task_id:
                self._send_json({"ok": False, "error": "taskId required"}, 400)
                return
            data = load_data()
            task = next((t for t in data['tasks'] if t['id'] == task_id), None)
            if not task:
                self._send_json({"ok": False, "error": "task not found"}, 404)
                return
            if not task.get('waitingConfirmation'):
                self._send_json({"ok": False, "error": "task is not waiting for confirmation"}, 400)
                return
            task['waitingConfirmation'] = False
            task['currentStep'] = task.get('currentStep', 0) + 1
            save_data(data)
            self._send_json({"ok": True, "task": task})
            return

        # --- /append_log: 追加内容到任务 agentLog（话题追踪用）---
        if path == '/append_log':
            task_id = body.get('taskId')
            content = body.get('content', '')
            if not task_id:
                self._send_json({"ok": False, "error": "taskId required"}, 400)
                return
            data = load_data()
            task = next((t for t in data['tasks'] if t['id'] == task_id), None)
            if not task:
                self._send_json({"ok": False, "error": "task not found"}, 404)
                return
            old_log = task.get('agentLog') or ''
            timestamp = time.strftime('[%Y-%m-%d %H:%M:%S]')
            entry = f"\n{timestamp} {content}"
            task['agentLog'] = old_log + entry
            save_data(data)
            self._send_json({"ok": True, "task": task})
            return

        # --- /by_topic: 按 topicId 查找任务 ---
        if path == '/by_topic':
            topic_id = body.get('topicId')
            if not topic_id:
                self._send_json({"ok": False, "error": "topicId required"}, 400)
                return
            data = load_data()
            tasks = [t for t in data['tasks'] if t.get('topicId') == topic_id]
            self._send_json({"ok": True, "tasks": tasks})
            return

        # --- /revert: 回退 done → pending（任务回滚）---
        if path == '/revert':
            task_id = body.get('taskId')
            if not task_id:
                self._send_json({"ok": False, "error": "taskId required"}, 400)
                return
            data = load_data()
            task = next((t for t in data['tasks'] if t['id'] == task_id), None)
            if not task:
                self._send_json({"ok": False, "error": "task not found"}, 404)
                return
            if task.get('status') not in ('done', 'running'):
                self._send_json({"ok": False, "error": f"task is {task.get('status')}, can only revert done or running"}, 400)
                return
            task['status'] = 'pending'
            task['startedAt'] = None
            task['finishedAt'] = None
            task['waitingConfirmation'] = False
            task['currentStep'] = 0
            save_data(data)
            self._send_json({"ok": True, "task": task})
            return

        # --- /metrics: 核心指标统计 ---
        if path == '/metrics':
            data = load_data()
            tasks = data['tasks']
            total = len(tasks)
            done = [t for t in tasks if t.get('status') == 'done']
            running = [t for t in tasks if t.get('status') == 'running']
            pending = [t for t in tasks if t.get('status') == 'pending']

            # 计算平均执行时间（分钟）
            times = []
            for t in done:
                if t.get('startedAt') and t.get('finishedAt'):
                    times.append((t['finishedAt'] - t['startedAt']) / 60000)
            avg_time = round(sum(times) / len(times), 1) if times else 0

            # 成功率
            success_rate = round(len(done) / total * 100, 1) if total > 0 else 0

            self._send_json({
                "ok": True,
                "total": total,
                "pending": len(pending),
                "running": len(running),
                "done": len(done),
                "avgTimeMin": avg_time,
                "successRate": success_rate,
                "maxConcurrent": MAX_CONCURRENT
            })
            return

        self._send_json({"error": "Not found"}, 404)


def run_server():
    server = HTTPServer(('127.0.0.1', PORT), MailboxHandler)
    print(f"[Mailbox] 启动服务 on http://127.0.0.1:{PORT}")
    print(f"[Mailbox] API: /list /task/:id /enqueue /dequeue /ack /start /pause /delete /continue /revert /metrics")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[Mailbox] 停止服务")
        sys.exit(0)


if __name__ == '__main__':
    run_server()
