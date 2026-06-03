#!/usr/bin/env python3
"""Scrapling backend - called from WebUI via subprocess"""
import sys, json, time

def cmd_test(url):
    """Quick test: fetch a URL with StealthyFetcher"""
    from scrapling.fetchers import StealthyFetcher
    StealthyFetcher.adaptive = True
    t0 = time.time()
    try:
        p = StealthyFetcher.fetch(url, headless=True, network_idle=True, timeout=30)
        title = p.css('title::text').get() or 'no title'
        text = p.css('body').text_content()[:500]
        return {
            "ok": True, "title": title.strip(),
            "size": len(text),
            "time": round(time.time() - t0, 1),
            "preview": text[:200].strip()
        }
    except Exception as e:
        return {"ok": False, "error": str(e), "time": round(time.time() - t0, 1)}

def cmd_stealth(url):
    """Stealth mode: full anti-detection"""
    from scrapling.fetchers import StealthyFetcher
    StealthyFetcher.configure(
        headless=True, network_idle=True,
        adapt=True, auto_save=True
    )
    t0 = time.time()
    try:
        p = StealthyFetcher.fetch(url, timeout=30)
        return {
            "ok": True, "title": (p.css('title::text').get() or '')[:100],
            "time": round(time.time() - t0, 1),
            "detected": "cloudflare" in (p.text_content()[:500].lower())
        }
    except Exception as e:
        return {"ok": False, "error": str(e), "time": round(time.time() - t0, 1)}

if __name__ == '__main__':
    if len(sys.argv) < 3:
        print(json.dumps({"error": "usage: scrapling_backend.py <test|stealth> <url>"}))
        sys.exit(1)
    cmd = sys.argv[1]
    url = sys.argv[2]
    if cmd == 'test':
        result = cmd_test(url)
    elif cmd == 'stealth':
        result = cmd_stealth(url)
    else:
        result = {"error": f"unknown cmd: {cmd}"}
    print(json.dumps(result, ensure_ascii=False))
