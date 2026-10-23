import { useCallback, useSyncExternalStore } from "react";
import { router } from "expo-router";
import { api } from "@/src/api";

// Optimistic "saved" flags shared by every tile and the detail screen, so a heart toggled in one place updates everywhere.
const overrides = new Map<string, boolean>();
const listeners = new Set<() => void>();
let version = 0;
const emit = () => { version++; listeners.forEach((l) => l()); };
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };
const getVersion = () => version;

export function clearSavedOverrides() { overrides.clear(); emit(); }

export function useSaved(slug: string, serverValue: boolean | null | undefined, signedIn: boolean) {
  useSyncExternalStore(subscribe, getVersion);
  const saved = overrides.has(slug) ? overrides.get(slug)! : !!serverValue;
  const toggle = useCallback(async () => {
    if (!signedIn) { router.push("/auth"); return; }
    const next = !saved;
    overrides.set(slug, next); emit();
    try {
      if (next) await api.savePackage(slug); else await api.unsavePackage(slug);
    } catch {
      overrides.set(slug, !next); emit(); // roll back
    }
  }, [saved, signedIn, slug]);
  return { saved, toggle };
}
