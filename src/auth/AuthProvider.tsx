import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";
import { api, ApiError, setSessionExpiredHandler, type User } from "@/src/api";
import { clearSession, loadSession, saveSession } from "@/src/api/token-store";
import { clearOffline } from "@/src/lib/offline";

type Status = "loading" | "signedOut" | "signedIn";
type AuthValue = {
  status: Status;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (input: { name: string; email: string; phone?: string; password: string }) => Promise<void>;
  signOut: () => Promise<void>;
  setUser: (u: User) => void;
  /** Called after the account was deleted on the server. */
  localSignOut: () => Promise<void>;
};

const Ctx = createContext<AuthValue | null>(null);
const USER_KEY = "bdt.user.v1";
const deviceName = () => (Constants.deviceName || `${Platform.OS} device`).slice(0, 100);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [user, setUserState] = useState<User | null>(null);
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  const setUser = useCallback((u: User) => {
    setUserState(u);
    AsyncStorage.setItem(USER_KEY, JSON.stringify(u)).catch(() => {});
  }, []);

  const localSignOut = useCallback(async () => {
    const id = userRef.current?.id;
    await clearSession();
    await AsyncStorage.removeItem(USER_KEY).catch(() => {});
    if (id) await clearOffline(id);
    setUserState(null);
    setStatus("signedOut");
  }, []);

  useEffect(() => {
    setSessionExpiredHandler(() => { localSignOut(); });
    return () => setSessionExpiredHandler(null);
  }, [localSignOut]);

  // Restore the session on launch. Offline launches keep the user signed in using the cached profile.
  useEffect(() => {
    let alive = true;
    (async () => {
      const session = await loadSession();
      if (!session) { if (alive) setStatus("signedOut"); return; }
      try {
        const cached = await AsyncStorage.getItem(USER_KEY);
        if (cached && alive) { setUserState(JSON.parse(cached) as User); setStatus("signedIn"); }
      } catch { /* ignore */ }
      try {
        const fresh = await api.me();
        if (!alive) return;
        setUser(fresh);
        setStatus("signedIn");
      } catch (e) {
        if (!alive) return;
        if (e instanceof ApiError && !e.isNetwork && (e.status === 401 || e.status === 403)) await localSignOut();
        else if (!userRef.current) setStatus("signedOut"); // offline and nothing cached; tokens are kept for next launch
      }
    })();
    return () => { alive = false; };
  }, [localSignOut, setUser]);

  const signIn = useCallback(async (email: string, password: string) => {
    const res = await api.login({ email: email.trim(), password, device_name: deviceName() });
    await saveSession(res);
    setUser(res.user);
    setStatus("signedIn");
  }, [setUser]);

  const signUp = useCallback(async (input: { name: string; email: string; phone?: string; password: string }) => {
    const res = await api.register({ ...input, email: input.email.trim(), name: input.name.trim(), phone: input.phone?.trim() || undefined, device_name: deviceName() });
    await saveSession(res);
    setUser(res.user);
    setStatus("signedIn");
  }, [setUser]);

  const signOut = useCallback(async () => {
    try { await api.logout(); } catch { /* revoke is best effort; local sign-out always happens */ }
    await localSignOut();
  }, [localSignOut]);

  const value = useMemo(() => ({ status, user, signIn, signUp, signOut, setUser, localSignOut }), [status, user, signIn, signUp, signOut, setUser, localSignOut]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth must be inside AuthProvider");
  return v;
}
