import { create } from "zustand";
import { User } from "../types";

const loadStoredUser = (): User | null => {
  if (typeof window === "undefined") return null;
  const storedUser = localStorage.getItem("medvision_user");
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as User;
  } catch {
    return null;
  }
};

interface AuthState {
  user: User | null;
  isAuthModalOpen: boolean;
  authModalView: "signin" | "signup";
  setUser: (user: User) => void;
  clearUser: () => void;
  openAuthModal: (view?: "signin" | "signup") => void;
  closeAuthModal: () => void;
  setAuthModalView: (view: "signin" | "signup") => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: loadStoredUser(),
  isAuthModalOpen: false,
  authModalView: "signin",
  setUser: (user) => set({ user }),
  clearUser: () => set({ user: null }),
  openAuthModal: (view = "signin") => {
    set({ isAuthModalOpen: true, authModalView: view });
    document.body.style.overflow = "hidden";
    document.body.style.height = "100vh";
  },
  closeAuthModal: () => {
    set({ isAuthModalOpen: false });
    document.body.style.overflow = "auto";
    document.body.style.height = "auto";
  },
  setAuthModalView: (view) => set({ authModalView: view }),
}));
