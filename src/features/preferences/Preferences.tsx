import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface Preferences {
  /** Nudge again (and offer "Tell guardian") when a dose is left unanswered. */
  followUps: boolean;
  /** Larger text, larger buttons, and fewer things on screen. */
  simpleMode: boolean;
}

export const DEFAULT_PREFERENCES: Preferences = { followUps: true, simpleMode: false };
const STORAGE_KEY = "mediulr:preferences";

/** Latest saved values for code that runs outside React (notification handlers). Updated by the provider. */
let latest: Preferences = DEFAULT_PREFERENCES;
export const getPreferences = () => latest;

interface PreferencesContextValue {
  prefs: Preferences;
  setPreference: <K extends keyof Preferences>(key: K, value: Preferences[K]) => void;
}

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

/** Loads saved preferences before rendering the app, so the first frame is already in the right size and mode. */
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(DEFAULT_PREFERENCES);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        const saved = raw ? JSON.parse(raw) : {};
        // Only take known keys of the right type, so a bad or older save can't break the app.
        const merged: Preferences = {
          followUps: typeof saved.followUps === "boolean" ? saved.followUps : DEFAULT_PREFERENCES.followUps,
          simpleMode: typeof saved.simpleMode === "boolean" ? saved.simpleMode : DEFAULT_PREFERENCES.simpleMode,
        };
        latest = merged;
        setPrefs(merged);
      })
      .catch(() => undefined)
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  const setPreference = useCallback<PreferencesContextValue["setPreference"]>((key, value) => {
    setPrefs((current) => {
      const next = { ...current, [key]: value };
      latest = next;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  const value = useMemo(() => ({ prefs, setPreference }), [prefs, setPreference]);
  if (!ready) return null;
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used within a PreferencesProvider");
  return ctx;
}
