import type { Page } from "@playwright/test";

export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const PROFILE_ID = "22222222-2222-4222-8222-222222222222";
const yesterday = new Date(Date.now() - 86_400_000).toISOString();
export async function mockSupabase(page: Page) {
  const user = { id: USER_ID, aud: "authenticated", role: "authenticated", email: "qa@example.test",
    app_metadata: { provider: "email", providers: ["email"] }, user_metadata: {}, identities: [],
    created_at: yesterday, updated_at: yesterday, email_confirmed_at: yesterday };
  const payload = Buffer.from(JSON.stringify({ sub: USER_ID, aud: "authenticated", role: "authenticated", exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
  const token = `${Buffer.from('{"alg":"HS256","typ":"JWT"}').toString("base64url")}.${payload}.test`;
  const session = { access_token: token, refresh_token: "test-refresh", token_type: "bearer", expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600, user };
  const tables: Record<string, Record<string, any>[]> = {
    profiles: [{ id: PROFILE_ID, owner_id: USER_ID, is_self: true, display_name: "Test Person", date_of_birth: null, created_at: yesterday }],
    medications: [{ id: "33333333-3333-4333-8333-333333333333", profile_id: PROFILE_ID, name: "Test medicine", dosage: "1 tablet", instructions: null,
      recurrence_rule: { type: "times_per_day", count: 1, at: ["12:00"] }, quantity_on_hand: 10, refill_threshold: 3,
      start_date: yesterday.slice(0, 10), end_date: null, archived_at: null, created_at: yesterday }],
    appointments: [], food_entries: [], exercise_entries: [], guardians: [], custom_reminders: [], reminder_completions: [], dose_logs: [],
  };
  const state = { offline: false, rejectProfiles: false, tables, writes: [] as string[] };
  await page.route("**/*.supabase.co/**", async (route) => {
    const request = route.request();
    if (state.offline) return route.abort("internetdisconnected");
    const url = new URL(request.url());
    const json = (body: unknown, status = 200) => {
      if (Array.isArray(body) && request.headers().accept?.includes("application/vnd.pgrst.object+json")) {
        if (body.length !== 1) return route.fulfill({ status: 406, contentType: "application/json", body: JSON.stringify({ code: "PGRST116", message: "Expected one row", details: `${body.length} rows` }) });
        body = body[0];
      }
      return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    };
    if (url.pathname.endsWith("/token")) {
      if (request.postDataJSON()?.password === "wrong-password") return json({ code: "invalid_credentials", msg: "Invalid login credentials" }, 400);
      return json(session);
    }
    if (url.pathname.endsWith("/user")) return json(user);
    if (url.pathname.includes("/auth/v1/")) return json({});
    const table = url.pathname.split("/").pop()!;
    const rows = tables[table] ?? [];
    if (table === "profiles" && state.rejectProfiles) return json({ code: "42501", message: "Permission denied" }, 403);
    const matches = (row: Record<string, any>) => [...url.searchParams].every(([key, filter]) => {
      if (["select", "order", "limit", "on_conflict"].includes(key)) return true;
      const [op, ...parts] = filter.split(".");
      const value = parts.join(".");
      if (op === "eq") return String(row[key]) === value;
      if (op === "in") return value.slice(1, -1).split(",").includes(String(row[key]));
      if (op === "gte") return new Date(row[key]).getTime() >= new Date(value).getTime();
      if (op === "lte") return new Date(row[key]).getTime() <= new Date(value).getTime();
      return true;
    });
    if (request.method() === "GET") return json(rows.filter(matches).slice(0, Number(url.searchParams.get("limit") ?? 1000)));
    state.writes.push(`${request.method()} ${table}`);
    if (request.method() === "POST") {
      const body = request.postDataJSON();
      const inserted = Array.isArray(body) ? body : [body];
      for (const row of inserted) {
        if (table === "dose_logs") {
          const prior = rows.find((old) => old.medication_id === row.medication_id && old.scheduled_at === row.scheduled_at);
          if (prior) Object.assign(prior, row);
          else rows.push({ id: crypto.randomUUID(), ...row });
        } else rows.push(row);
      }
      return json(table === "dose_logs" ? rows.filter((r) => r.medication_id === body.medication_id) : inserted, 201);
    }
    if (request.method() === "PATCH") {
      const changed = rows.filter(matches);
      changed.forEach((row) => Object.assign(row, request.postDataJSON()));
      return json(changed);
    }
    if (request.method() === "DELETE") {
      tables[table] = rows.filter((row) => !matches(row));
      return json([]);
    }
    return json({});
  });
  return state;
}

export async function signIn(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill("qa@example.test");
  await page.getByLabel("Password", { exact: true }).fill("test-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.getByRole("tab", { name: "Calendar", exact: true }).waitFor();
}
