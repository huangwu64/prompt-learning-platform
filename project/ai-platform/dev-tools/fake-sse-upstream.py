"""假的 OpenAI 兼容上游，用于验证后端 AI 链路（不消耗真实 API 额度）。

- 请求体带 `"stream": true` → 返回 SSE，每帧间隔 0.3s，
  便于用到达时间戳证明「增量是逐帧转发」而不是一次性吐出。
- 否则 → 返回普通的非流式 JSON 补全响应。

用法：python dev-tools/fake-sse-upstream.py   （监听 127.0.0.1:9099）
配合启动后端：
  DEEPSEEK_BASE_URL=http://127.0.0.1:9099 DEEPSEEK_API_KEY=sk-fake java -jar target/ai-platform.jar
"""
import json
import time
from http.server import BaseHTTPRequestHandler, HTTPServer

CHUNKS = ["你好", "，这是", "一段", "流式", "回复", "测试"]


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.0"   # 无 Content-Length 时靠关闭连接表示结束

    def do_POST(self):
        length = int(self.headers.get("Content-Length", 0))
        try:
            body = json.loads(self.rfile.read(length).decode("utf-8") or "{}")
        except Exception:
            body = {}

        if body.get("stream"):
            self._stream()
        else:
            self._oneshot()

    def _stream(self):
        self.send_response(200)
        self.send_header("Content-Type", "text/event-stream")
        self.end_headers()

        self._frame(": ping")                      # 心跳注释帧
        for chunk in CHUNKS:
            self._frame("data: " + json.dumps(
                {"choices": [{"delta": {"content": chunk}}]}, ensure_ascii=False))
            time.sleep(0.3)

        self._frame("data: " + json.dumps(
            {"choices": [], "usage": {"prompt_tokens": 11, "completion_tokens": 6, "total_tokens": 17}}))
        self._frame("data: [DONE]")

    def _oneshot(self):
        payload = json.dumps({
            "choices": [{"message": {"role": "assistant", "content": "".join(CHUNKS)}}],
            "usage": {"prompt_tokens": 11, "completion_tokens": 6, "total_tokens": 17},
        }, ensure_ascii=False).encode("utf-8")

        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _frame(self, text):
        self.wfile.write((text + "\n\n").encode("utf-8"))
        self.wfile.flush()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    HTTPServer(("127.0.0.1", 9099), Handler).serve_forever()
