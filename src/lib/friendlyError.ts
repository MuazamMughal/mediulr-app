/**
 * Turns a raw error (Postgrest/Supabase error, network failure, etc.) into a short,
 * human sentence safe to show in an alert. The original error is still logged to the
 * console for debugging — this function only controls what the user sees.
 */
export function friendlyError(err: unknown, fallback = "Something went wrong. Please try again."): string {
  console.warn(err);

  if (err instanceof Error) {
    const message = err.message.toLowerCase();
    if (message.includes("network") || message.includes("fetch")) {
      return "Couldn't connect — check your internet connection and try again.";
    }
    if (message.includes("invalid login credentials")) {
      return "That email or password doesn't match an account. Check and try again.";
    }
    if (message.includes("email not confirmed")) {
      return "Please confirm your email before signing in.";
    }
    if (message.includes("user already registered")) {
      return "An account with that email already exists — try signing in instead.";
    }
    if (message.includes("password") && message.includes("6 character")) {
      return "Password needs to be at least 6 characters.";
    }
    if (message.includes("row-level security") || message.includes("permission denied")) {
      return "You don't have permission to do that.";
    }
  }

  return fallback;
}
