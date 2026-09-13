import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Props {
  /** 已审核通过的头像 URL。**不要传待审中的图**，那等于绕过审核 */
  src?: string | null;
  /** 用户名，用于生成首字母占位 */
  name?: string | null;
  className?: string;
  fallbackClassName?: string;
}

/**
 * 用户头像：有已通过审核的头像就显示图片，否则回落「用户名首字母」占位。
 *
 * 补的是一个既有缺口 —— 改造前 Sidebar / TopBar 只渲染 AvatarFallback、
 * 从不渲染 AvatarImage，所以真实头像即使有 URL 也从不会显示。
 *
 * Radix 的 AvatarImage 会在图片加载失败时自动切回 Fallback，
 * 因此文件被删/URL 失效都不会出现裂图。
 */
export function UserAvatar({ src, name, className, fallbackClassName }: Props) {
  const initial = name?.trim()?.[0]?.toUpperCase() || "U";

  return (
    <Avatar className={cn("shrink-0", className)}>
      {src ? <AvatarImage src={src} alt={name ? `${name} 的头像` : "用户头像"} /> : null}
      <AvatarFallback className={cn("bg-blue-50 text-blue-600 font-medium", fallbackClassName)}>
        {initial}
      </AvatarFallback>
    </Avatar>
  );
}
