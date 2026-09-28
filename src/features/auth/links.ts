import * as Linking from "expo-linking";

/** Register this exact URL in Supabase Auth > URL Configuration for each build target. */
export function authRedirectUrl(flow?: "signup" | "recovery"): string {
  return Linking.createURL("auth/callback", flow ? { queryParams: { flow } } : undefined);
}
