import { create } from "zustand";

export type SectionId = "learning" | "chat" | "works" | "challenge" | "profile";

interface UiState {
  /** 右侧当前显示的模块 */
  activeSection: SectionId;
  setActiveSection: (id: SectionId) => void;
  /** 左侧导航栏是否折叠 */
  collapsed: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeSection: "learning",
  setActiveSection: (id) => set({ activeSection: id }),
  collapsed: false,
  toggleSidebar: () => set((s) => ({ collapsed: !s.collapsed })),
}));
