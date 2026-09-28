export type AuthLink =
  | { kind: "session"; accessToken: string; refreshToken: string; recovery: boolean; newAccount: boolean }
  | { kind: "code"; code: string; recovery: boolean; newAccount: boolean }
  | { kind: "otp"; tokenHash: string; type: "signup" | "recovery" | "email" | "magiclink" | "invite" | "email_change"; recovery: boolean; newAccount: boolean };

/** Query and fragment parameters both occur in Supabase email callbacks. */
export function parseAuthLink(url: string): AuthLink {
  const parsed = new URL(url);
  const params = new URLSearchParams(parsed.search);
  const fragment = new URLSearchParams(parsed.hash.replace(/^#/, ""));
  for (const [key, value] of fragment) params.set(key, value);
  const error = params.get("error_description") ?? params.get("error");
  if (error) throw new Error(error);
  const recovery = params.get("type") === "recovery" || params.get("flow") === "recovery";
  const newAccount = params.get("type") === "signup" || params.get("flow") === "signup";
  const accessToken = params.get("access_token");
  const refreshToken = params.get("refresh_token");
  if (accessToken && refreshToken) return { kind: "session", accessToken, refreshToken, recovery, newAccount };
  const code = params.get("code");
  if (code) return { kind: "code", code, recovery, newAccount };
  const tokenHash = params.get("token_hash");
  const type = params.get("type");
  if (tokenHash && (type === "signup" || type === "recovery" || type === "email" || type === "magiclink" || type === "invite" || type === "email_change")) {
    return { kind: "otp", tokenHash, type, recovery, newAccount };
  }
  throw new Error("The email link is incomplete or has expired. Request a new one.");
}
