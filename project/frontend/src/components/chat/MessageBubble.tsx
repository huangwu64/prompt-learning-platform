import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { User } from "lucide-react";
import type { Message } from "@/types";

interface Props {
  message: Message;
}

/**
 * 对话消息气泡 — 中性灰体系（参考 highstorm）
 * - assistant：左对齐深灰卡片
 * - user：右对齐白底深字
 */
export const MessageBubble = memo(function MessageBubble({ message }: Props) {
  const isUser = message.role === "user";

  return (
    <div className={`flex gap-3 w-full ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-8 h-8 shrink-0 rounded-full border border-[#E5E6EA] bg-white flex items-center justify-center">
          <span className="text-[10px] font-semibold text-[#3A3A3A]">AI</span>
        </div>
      )}

      <div
        className={`max-w-[78%] px-4 py-3 rounded-xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
          isUser
            ? "bg-blue-50 border border-blue-200 text-[#171717] rounded-tr-md"
            : "bg-white border border-[#E5E6EA] text-[#3A3A3A] rounded-tl-md"
        }`}
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
                strong: ({ children }) => <strong className="text-[#171717] font-semibold">{children}</strong>,
                h1: ({ children }) => <h1 className="wb-title text-lg my-2">{children}</h1>,
                h2: ({ children }) => <h2 className="wb-title text-base my-2">{children}</h2>,
                h3: ({ children }) => <h3 className="wb-title text-sm my-1.5">{children}</h3>,
                a: ({ children, href }) => (
                  <a href={href} target="_blank" rel="noreferrer" className="text-[#3A3A3A] underline underline-offset-2">
                    {children}
                  </a>
                ),
                pre: ({ children }) => (
                  <pre className="my-2 p-3 rounded-xl bg-white border border-[#E5E6EA] overflow-x-auto text-[12px] leading-relaxed">
                    {children}
                  </pre>
                ),
                code: ({ className, children }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return <code className={className}>{children}</code>;
                  }
                  return (
                    <code className="px-1.5 py-0.5 rounded-md bg-[#F0F1F4] text-[#3A3A3A] text-[12px]">
                      {children}
                    </code>
                  );
                },
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-[#D6D8DE] pl-3 my-2 text-[#737373]">
                    {children}
                  </blockquote>
                ),
                table: ({ children }) => (
                  <div className="my-2 overflow-x-auto">
                    <table className="min-w-full border border-[#E5E6EA] rounded-lg text-[12px]">{children}</table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="border border-[#E5E6EA] px-2.5 py-1.5 bg-[#F0F1F4]/60 text-left font-medium">{children}</th>
                ),
                td: ({ children }) => (
                  <td className="border border-[#E5E6EA] px-2.5 py-1.5">{children}</td>
                ),
                hr: () => <hr className="my-3 border-[#E5E6EA]" />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>

      {isUser && (
        <div className="w-8 h-8 shrink-0 rounded-full border border-[#E5E6EA] bg-[#F0F1F4] flex items-center justify-center">
          <User className="w-3.5 h-3.5 text-[#3A3A3A]" />
        </div>
      )}
    </div>
  );
});
