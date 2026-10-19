import { create } from "zustand";
import { healthCheck, login as loginOnline, logout as logoutOnline, setApiAccessToken, signup as signupOnline, type AuthCredentials, type Nurse } from "../services/api";

type AuthSession = { accessToken: string; nurse: Nurse };

type AuthStore = {
  session: AuthSession | null;
  login: (credentials: Pick<AuthCredentials, "email" | "password">, expectedRole?: Nurse["role"]) => Promise<"local">;
  signup: (credentials: AuthCredentials) => Promise<"local">;
  logout: () => Promise<void>;
  clearSession: () => void;
};

export const useAuthStore = create<AuthStore>((set) => ({
  session: null,

  login: async (credentials, expectedRole) => {
    await healthCheck();
    const response = await loginOnline(credentials);
    const session = response;
    if (expectedRole && session.nurse.role !== expectedRole) {
      throw new Error("This account does not have access to the selected portal. Choose the portal that matches your account.");
    }
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
