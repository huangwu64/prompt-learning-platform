import { memo } from "react";
import { motion } from "framer-motion";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { User } from "lucide-react";
import type { Message } from "@/types";
import { SparkLogo } from "./SparkLogo";

interface Props {
  message: Message;
  index?: number;
}

/** HH:mm 时间戳 */
function timeOf(iso: string): string {
  try {
    const d = new Date(iso);
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return "";
  }
}

/**
 * 对话消息气泡（品牌装饰版）：
 * - AI：白玻璃 + 左侧品牌三色渐变线 + 左上对话尾巴
 * - 用户：淡蓝紫渐变底 + 右下对话尾巴
 * 逐条滑入，hover 微发光。
 */
export const MessageBubble = memo(function MessageBubble({ message, index = 0 }: Props) {
  const isUser = message.role === "user";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, x: isUser ? 18 : -18 }}
      animate={{ opacity: 1, y: 0, x: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.18), ease: [0.4, 0, 0.2, 1] }}
      className={`flex gap-3.5 w-full ${isUser ? "justify-end" : "justify-start"}`}
    >
      {!isUser && <SparkLogo size={36} />}

      <div className={`flex flex-col gap-1 max-w-[85%] ${isUser ? "items-end" : "items-start"}`}>
        {/* 气泡（带装饰） */}
        <div className={`relative ${isUser ? "" : ""}`}>
          {/* AI：左侧品牌三色渐变线 */}
          {!isUser && (
            <span
              aria-hidden
              className="absolute left-0 top-3.5 bottom-3.5 w-[3px] rounded-full bg-gradient-to-b from-blue-500 via-blue-600 to-blue-700"
            />
          )}

          {/* 气泡本体 */}
          <div
            className={`px-5 py-3.5 text-[15px] leading-relaxed whitespace-pre-wrap break-words transition-shadow duration-200 ${
              isUser
                ? "relative rounded-2xl rounded-br-md border border-blue-200/70 text-app-fg hover:shadow-[0_6px_18px_-6px_rgba(94,106,210,0.3)]"
                : "relative rounded-2xl rounded-tl-md border border-app-border text-app-t2 pl-6 hover:shadow-[0_6px_18px_-6px_rgba(0,0,0,0.12)]"
            }`}
            style={
              isUser
                ? { background: "linear-gradient(135deg, #F3F2FD 0%, #E7E5FB 100%)" }
                : {
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.65), rgba(255,255,255,0) 26%), #FFFFFF",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.9)",
                  }
            }
          >
            {isUser ? (
              message.content
            ) : (
              <div>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight]}
                  components={{
                    p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
                    ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-0.5">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-0.5">{children}</ol>,
                    li: ({ children }) => <li className="my-0.5">{children}</li>,
                    strong: ({ children }) => <strong className="text-app-fg font-semibold">{children}</strong>,
                    h1: ({ children }) => <h1 className="wb-title text-lg my-2">{children}</h1>,
                    h2: ({ children }) => <h2 className="wb-title text-base my-2">{children}</h2>,
                    h3: ({ children }) => <h3 className="wb-title text-sm my-1.5">{children}</h3>,
                    a: ({ children, href }) => (
                      <a href={href} target="_blank" rel="noreferrer" className="text-app-t2 underline underline-offset-2">
                        {children}
                      </a>
                    ),
                    pre: ({ children }) => (
                      <pre className="my-2 p-3 rounded-xl bg-app-surface border border-app-border overflow-x-auto text-[12px] leading-relaxed">
                        {children}
                      </pre>
                    ),
                    code: ({ className, children }) => {
                      const isBlock = className?.includes("language-");
                      if (isBlock) {
                        return <code className={className}>{children}</code>;
                      }
                      return (
                        <code className="px-1.5 py-0.5 rounded-md bg-app-chrome text-app-t2 text-[12px]">
                          {children}
                        </code>
                      );
                    },
                    blockquote: ({ children }) => (
                      <blockquote className="border-l-2 border-app-borderStrong pl-3 my-2 text-app-t3">
                        {children}
                      </blockquote>
                    ),
                    table: ({ children }) => (
                      <div className="my-2 overflow-x-auto">
                        <table className="min-w-full border border-app-border rounded-lg text-[12px]">{children}</table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className="border border-app-border px-2.5 py-1.5 bg-app-chrome/60 text-left font-medium">{children}</th>
                    ),
                    td: ({ children }) => (
                      <td className="border border-app-border px-2.5 py-1.5">{children}</td>
                    ),
                    hr: () => <hr className="my-3 border-app-border" />,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* 对话尾巴（小三角指向头像） */}
          {isUser ? (
            <span
              aria-hidden
              className="absolute -right-[5px] bottom-[7px] w-2 h-2 rotate-45 border-r border-b border-blue-200/70"
              style={{ background: "#F6F0FF" }}
            />
          ) : (
            <span
              aria-hidden
              className="absolute -left-[5px] top-[11px] w-2 h-2 rotate-45 border-l border-b border-app-border"
              style={{ background: "#FFFFFF" }}
            />
          )}
        </div>

        {/* 时间戳 */}
        {message.createdAt && (
          <span
            className={`text-[10px] text-app-t4/80 tabular-nums ${isUser ? "self-end pr-1" : "self-start pl-1"}`}
          >
            {timeOf(message.createdAt)}
          </span>
        )}
      </div>

      {isUser && (
        <motion.div
          className="w-9 h-9 shrink-0 rounded-full border border-app-border bg-app-chrome flex items-center justify-center"
          whileHover={{ scale: 1.06 }}
        >
          <User className="w-4 h-4 text-app-t2" />
        </motion.div>
      )}
    </motion.div>
  );
});
