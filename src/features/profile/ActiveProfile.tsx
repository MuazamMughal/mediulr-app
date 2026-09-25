import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import type { Profile } from "../../types/domain";
import { useProfiles } from "./useProfiles";

interface ActiveProfileContextValue {
  activeProfileId: string | null;
  setActiveProfileId: (id: string | null) => void;
}

const ActiveProfileContext = createContext<ActiveProfileContextValue | null>(null);

export function ActiveProfileProvider({ children }: { children: ReactNode }) {
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const value = useMemo(() => ({ activeProfileId, setActiveProfileId }), [activeProfileId]);
  return <ActiveProfileContext.Provider value={value}>{children}</ActiveProfileContext.Provider>;
}

/**
 * The profile whose medications, visits and calendar are on screen — the signed-in user's own
 * profile by default, or a family member they've switched to on the Profile tab.
 */
export function useActiveProfile(): {
  profile: Profile | undefined;
  profiles: Profile[] | undefined;
  isViewingSelf: boolean;
  setActiveProfileId: (id: string | null) => void;
  isLoading: boolean;
} {
  const ctx = useContext(ActiveProfileContext);
  if (!ctx) throw new Error("useActiveProfile must be used within an ActiveProfileProvider");
  const { data: profiles, isLoading } = useProfiles();

  const self = profiles?.find((p) => p.isSelf);
  // If the selected profile no longer exists (e.g. after a sign-out), fall back to the user's own.
  const selected = ctx.activeProfileId ? profiles?.find((p) => p.id === ctx.activeProfileId) : undefined;
  const profile = selected ?? self;

  return {
    profile,
    profiles,
    isViewingSelf: !profile || profile.isSelf,
    setActiveProfileId: ctx.setActiveProfileId,
    isLoading,
  };
}
