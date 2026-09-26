import { getI18n } from "../i18n";

/**
 * Turns a raw error (Postgrest/Supabase error, network failure, etc.) into a short,
 * human sentence safe to show in an alert, in the current language. The original error
 * is still logged to the console for debugging — this function only controls what the user sees.
 */
export function friendlyError(err: unknown, fallback?: string): string {
  console.warn(err);
  const { t } = getI18n();

  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    if (message.includes("network") || message.includes("fetch")) return t("error.network");
    if (message.includes("invalid login credentials")) return t("error.badLogin");
    if (message.includes("email not confirmed")) return t("error.confirmEmail");
    if (message.includes("user already registered")) return t("error.alreadyRegistered");
    if (message.includes("password") && message.includes("6 character")) return t("error.shortPassword");
    if (message.includes("row-level security") || message.includes("permission denied")) return t("error.permission");
  }

  return fallback ?? t("error.generic");
}
