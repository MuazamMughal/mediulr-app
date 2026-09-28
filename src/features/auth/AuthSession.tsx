import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabase";

const AuthSessionContext = createContext<Session | null | undefined>(undefined);

export function AuthSessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    // Subscribe first so a sign-in or sign-out during the initial read wins over its result.
    let changed = false;
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      changed = true;
      if (active) setSession(next);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (active && !changed) setSession(data.session);
    }).catch(() => {
      if (active && !changed) setSession(null);
    });
    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  return <AuthSessionContext.Provider value={session}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  return useContext(AuthSessionContext);
}
