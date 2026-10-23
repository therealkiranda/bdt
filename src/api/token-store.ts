import * as SecureStore from "expo-secure-store";
import type { TokenPair } from "./types";

// Tokens live in the Android Keystore / iOS Keychain via expo-secure-store (never AsyncStorage).
const KEY = "bdt.session.v1";

export type StoredSession = { accessToken: string; refreshToken: string; accessExpiresAt: number };

let memory: StoredSession | null = null;
let loaded = false;

export async function loadSession(): Promise<StoredSession | null> {
  if (loaded) return memory;
  try {
    const raw = await SecureStore.getItemAsync(KEY);
    memory = raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    memory = null;
  }
  loaded = true;
  return memory;
}

export async function saveSession(pair: TokenPair): Promise<StoredSession> {
  memory = {
    accessToken: pair.access_token,
    refreshToken: pair.refresh_token,
    accessExpiresAt: Date.now() + pair.expires_in * 1000
  };
  loaded = true;
  try {
    await SecureStore.setItemAsync(KEY, JSON.stringify(memory));
  } catch {
    // Keep the in-memory copy so the current run still works.
  }
  return memory;
}

export async function clearSession(): Promise<void> {
  memory = null;
  loaded = true;
  try {
    await SecureStore.deleteItemAsync(KEY);
  } catch {
    // ignore
  }
}
