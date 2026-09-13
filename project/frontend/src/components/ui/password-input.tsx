import * as React from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** 作用于 input 本身（高度、错误态边框等） */
  className?: string;
  /** 作用于外层容器：需要限制宽度（如 max-w-xs）时加在这里，不能加在 input 上 */
  containerClassName?: string;
  /** 可选的左侧图标（如 API Key 用钥匙图标）。有它时会自动给 input 留出左内边距 */
  leadingIcon?: LucideIcon;
}

/**
 * 密码输入框：右侧一个眼睛图标切换明文 / 密文。
 *
 * 只切换 input 的 type，**不改动 value 的传递** —— 上层拿到的始终是同一份文本，
 * 切换可见性不产生任何副作用。
 *
 * `type="button"` 是必需的：登录页的输入框在 <form> 里，
 * 不写的话点眼睛会触发表单提交。
 */
export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, containerClassName, leadingIcon: LeadingIcon, ...props }, ref) => {
    const [visible, setVisible] = React.useState(false);

    return (
      <div className={cn("relative w-full", containerClassName)}>
        {LeadingIcon && (
          <LeadingIcon className="w-3.5 h-3.5 text-app-t4 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        )}
        <input
          {...props}
          ref={ref}
          type={visible ? "text" : "password"}
          // pr-9 给右侧眼睛留位；pl-8 仅在有左图标时才加
          className={cn("wb-input h-9 pr-9", LeadingIcon && "pl-8", className)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "隐藏密码" : "显示密码"}
          aria-pressed={visible}
          title={visible ? "隐藏密码" : "显示密码"}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-md flex items-center justify-center text-app-t4 hover:text-app-fg hover:bg-app-chrome transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";
