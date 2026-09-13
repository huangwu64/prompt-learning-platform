import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthUser } from "@/types";

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

/** 当前持久化结构版本。改动已存字段含义时必须 +1 并补 migrate 分支 */
const PERSIST_VERSION = 2;

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: (token, user) => set({ token, user }),
      logout: () => set({ token: null, user: null }),
    }),
    {
      name: "auth-storage",
      version: PERSIST_VERSION,
      /**
       * v1 及更早的缓存里 user 没有 role 字段，且那时的 token 也不含 role claim
       * （后端是在权限体系改造后才签发带 role 的 token）。
       * 两种情况都会让 AdminGuard 与侧栏的「管理后台」入口判断失真，
       * 所以直接清空、强制重新登录 —— 这是唯一干净的解法。
       */
      migrate: (persisted, version) => {
        if (version < 2) {
          return { token: null, user: null } as AuthState;
        }
        return persisted as AuthState;
      },
    }
  )
);
