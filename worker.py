#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Mailbox Worker — Proma 架构的调度执行器
轮询 Mailbox → 拉取 agent 任务 → 分步执行 → 回传结果

设计原则（源自 SOUL.md 记忆路由 + trae.ai Builder Mode）:
- 只加载当前子任务相关 domain，不扫全量 memory
- 分步执行，每步暂停等待确认
- 最小算力消耗，最大结果产出
"""

import json
import os
import sys
import time
import urllib.request
import subprocess

# 配置
MAILBOX_URL = 'http://127.0.0.1:8648'
POLL_INTERVAL = 5  # 秒
MAX_CONCURRENT = 3

HERMES_CMD = r'C:\Users\YF00\AppData\Local\hermes\hermes-agent\venv\Scripts\hermes.exe'
HERMES_HOME = os.path.expandvars(r'%LOCALAPPDATA%\hermes')


def api_call(path, data=None):
    """调用 Mailbox API"""
    url = MAILBOX_URL + path
    method = 'POST' if data is not None else 'GET'
    req = urllib.request.Request(url, method=method)
    req.add_header('Content-Type', 'application/json')
    if data is not None:
        req.data = json.dumps(data).encode('utf-8')
    try:
        resp = urllib.request.urlopen(req, timeout=10)
        return json.loads(resp.read().decode('utf-8'))
    except Exception as e:
        return {'ok': False, 'error': str(e)}


def execute_agent_task(task):
    """执行 agent 任务 — 带分步确认"""
    task_id = task['id']
    title = task.get('title', '')
    desc = task.get('desc', '')
    steps = task.get('steps', [])
    priority = task.get('priority', 'P2')

    print(f"[Worker] 执行任务 [{task_id}] {title}")

    # 构建 hermes prompt — 内嵌 SOUL.md 核心规则
    soul_rules = """
【身份】Hermes Agent (Nous Research)，为用户 Sunshine 工作。最小算力消耗，最大结果产出。
【规则】直接简洁；先加载 skill 再动手；不自研轮子；每次只加载必要记忆。

【当前任务】
"""
    prompt = soul_rules + title
    if desc:
        prompt += '\n' + desc

    try:
        # 如果有步骤，分步执行
        if steps and len(steps) > 0:
            for i, step in enumerate(steps):
                if i > 0:
                    # 等待用户确认后再执行下一步
                    print(f"[Worker] 步骤 {i+1}/{len(steps)} 完成，等待确认...")
                    result = f"步骤 {i+1}/{len(steps)}: {step} 待执行"
                    api_call('/ack', {
                        'taskId': task_id,
                        'result': result,
                        'waitingConfirmation': True,
                        'currentStep': i + 1
                    })
                    # 轮询等待用户点击 /continue
                    while True:
                        time.sleep(2)
                        t = api_call('/task/' + task_id)
                        if isinstance(t, dict) and not t.get('waitingConfirmation'):
                            print(f"[Worker] 用户确认，继续步骤 {i+2}")
                            break

                print(f"[Worker] 步骤 {i+1}/{len(steps)}: {step}")
                step_prompt = f"{soul_rules}{title}\n\n【当前步骤】{step}\n{desc or ''}"
                result = run_hermes(step_prompt)

            # 全部步骤完成
            api_call('/ack', {
                'taskId': task_id,
                'result': f"全部 {len(steps)} 步完成",
                'agentLog': result or ''
            })
        else:
            # 无步骤，直接执行
            result = run_hermes(prompt)
            api_call('/ack', {
                'taskId': task_id,
                'result': '执行完成',
                'agentLog': result or ''
            })

        print(f"[Worker] 任务 [{task_id}] 完成")

    except Exception as e:
        print(f"[Worker] 任务 [{task_id}] 失败: {e}")
        api_call('/ack', {
            'taskId': task_id,
            'result': f'执行失败: {str(e)}',
            'agentLog': str(e)
        })


def run_hermes(prompt):
    """调用 hermes CLI 执行任务"""
    try:
        cmd = [HERMES_CMD, '-z', prompt]
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=300,
            cwd=HERMES_HOME,
            env={**os.environ, 'HERMES_HOME': HERMES_HOME}
        )
        output = result.stdout.strip()
        if result.returncode != 0:
            output = f"ERROR (exit={result.returncode}):\n{output}\n{result.stderr}"
        return output[-5000:] if len(output) > 5000 else output
    except subprocess.TimeoutExpired:
        return "超时 (5分钟)"
    except Exception as e:
        return f"执行异常: {str(e)}"


def main():
    print("[Worker] Mailbox Worker 启动", flush=True)
    print(f"[Worker] Mailbox: {MAILBOX_URL}", flush=True)
    print(f"[Worker] 轮询间隔: {POLL_INTERVAL}s", flush=True)
    print(f"[Worker] 并发上限: {MAX_CONCURRENT}", flush=True)

    while True:
        try:
            # 检查当前运行中的 agent 任务数
            tasks = api_call('/list', None)
            if not isinstance(tasks, dict):
                time.sleep(POLL_INTERVAL)
                continue

            running = [t for t in tasks.get('tasks', []) if t.get('status') == 'running' and t.get('taskType') == 'agent']
            if len(running) >= MAX_CONCURRENT:
                time.sleep(POLL_INTERVAL)
                continue

            # 拉取下一个待处理的 agent 任务
            pending = [t for t in tasks.get('tasks', []) if t.get('status') == 'pending' and t.get('taskType') == 'agent']
            if not pending:
                time.sleep(POLL_INTERVAL)
                continue

            # 优先级排序
            priority_order = {'P0': 0, 'P1': 1, 'P2': 2, 'P3': 3}
            pending.sort(key=lambda t: (priority_order.get(t.get('priority'), 99), t.get('createdAt', 0)))

            # 取第一个，通过 /dequeue 原子获取
            r = api_call('/dequeue', {})
            if r.get('ok'):
                task = r['task']
                execute_agent_task(task)

        except KeyboardInterrupt:
            print("\n[Worker] 停止")
            break
        except Exception as e:
            print(f"[Worker] 循环异常: {e}")
            time.sleep(POLL_INTERVAL)

        time.sleep(POLL_INTERVAL)


if __name__ == '__main__':
    main()
