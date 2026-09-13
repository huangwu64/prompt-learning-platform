import { useAuthStore } from "@/store/authStore";

/**
 * SSE 客户端（fetch + ReadableStream 手写解析）。
 *
 * 为什么不用 EventSource 或 apiClient：
 * - `EventSource` 无法携带自定义请求头，且只支持 GET —— 而后端全链路依赖
 *   `Authorization: Bearer`，助手发消息也需要 POST body。两者不可兼得。
 * - `apiClient` 是 axios，带 30s 超时且响应拦截器强制拆 `{success,data,error}` 信封，
 *   与流式响应天然不兼容。
 */

export interface SseHandlers {
  /** 收到一个事件。event 取 `event:` 行的值（缺省为 "message"） */
  onEvent: (event: string, data: string) => void;
  onError: (err: Error) => void;
  onClose: () => void;
}

/** 空闲超时：这么久收不到任何字节就认为连接已卡死 */
const IDLE_TIMEOUT_MS = 90_000;

export interface SseHandle {
  abort: () => void;
  /** 是否为用户主动中止（用于区分「停止」与「异常断开」） */
  readonly aborted: boolean;
}

/** 解析单个 SSE 事件块（`:` 开头是心跳注释，需跳过） */
function dispatch(rawEvent: string, handlers: SseHandlers): void {
  let event = "message";
  const dataLines: string[] = [];

  for (const line of rawEvent.split("\n")) {
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    } else if (line.startsWith("data:")) {
      // 规范允许 "data:value" 与 "data: value"，冒号后一个空格应被吃掉
      dataLines.push(line.slice(5).replace(/^ /, ""));
    }
  }

  if (dataLines.length > 0) {
    handlers.onEvent(event, dataLines.join("\n"));
  }
}

export function streamSse(url: string, body: unknown, handlers: SseHandlers): SseHandle {
  const controller = new AbortController();
  let idleTimer: number | undefined;
  let settled = false;
  let aborted = false;

  const handle: SseHandle = {
    get aborted() {
      return aborted;
    },
    abort: () => {
      aborted = true;
      settled = true;
      window.clearTimeout(idleTimer);
      controller.abort();
    },
  };

  const armIdleTimer = () => {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(() => {
      handle.abort();
      handlers.onError(new Error("响应超时，请重试"));
    }, IDLE_TIMEOUT_MS);
  };

  void (async () => {
    try {
      const token = useAuthStore.getState().token;
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!res.ok) {
        // 建连前失败（401/404/429/校验）时后端返回的是普通 Result 信封，能直接读 error
        let message = "请求失败，请稍后重试";
        try {
          const payload = await res.json();
          if (payload?.error) message = payload.error;
        } catch {
          // 非 JSON 响应，用默认文案
        }
        if (res.status === 401) {
          // 这里绕过了 apiClient 的拦截器，401 的全局登出逻辑要自己复制一份
          useAuthStore.getState().logout();
          window.location.href = "/login";
        }
        throw new Error(message);
      }

      if (!res.body) {
        throw new Error("响应没有可读流");
      }

      armIdleTimer();
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        armIdleTimer();
        buffer += decoder.decode(value, { stream: true });
        buffer = buffer.replace(/\r\n/g, "\n");

        let sep = buffer.indexOf("\n\n");
        while (sep !== -1) {
          dispatch(buffer.slice(0, sep), handlers);
          buffer = buffer.slice(sep + 2);
          sep = buffer.indexOf("\n\n");
        }
      }

      // 服务端未以空行结尾时，冲掉残留缓冲
      if (buffer.trim()) dispatch(buffer, handlers);

      window.clearTimeout(idleTimer);
      if (!settled) {
        settled = true;
        handlers.onClose();
      }
    } catch (err) {
      window.clearTimeout(idleTimer);
      if (settled) return;                       // 已被 abort() 收尾
      settled = true;
      if (err instanceof DOMException && err.name === "AbortError") {
        handlers.onClose();
        return;
      }
      handlers.onError(err instanceof Error ? err : new Error("请求失败"));
    }
  })();

  return handle;
}
