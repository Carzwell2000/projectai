import { create } from "zustand";
import { healthCheck, login as loginOnline, logout as logoutOnline, setApiAccessToken, signup as signupOnline, type AuthCredentials, type Nurse } from "../services/api";

type AuthSession = { accessToken: string; nurse: Nurse };

type AuthStore = {
  session: AuthSession | null;
  login: (credentials: Pick<AuthCredentials, "email" | "password">) => Promise<"local">;
  signup: (credentials: AuthCredentials) => Promise<"local">;
  logout: () => Promise<void>;
  clearSession: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,

  login: async (credentials) => {
    await healthCheck();
    const response = await loginOnline(credentials);
    const session = response;
    setApiAccessToken(session.accessToken);
    set({ session });
    return "local";
  },

  signup: async (credentials) => {
    const response = await signupOnline(credentials);
    const session = response;
    setApiAccessToken(session.accessToken);
    set({ session });
    return "local";
  },

  logout: async () => {
    try { await logoutOnline(); } catch {}
    setApiAccessToken(null);
    set({ session: null });
  },

  clearSession: () => {
    setApiAccessToken(null);
    set({ session: null });
  },
}));
