import { test, expect, type Page } from "@playwright/test";
import { mockSupabase, signIn } from "./mockSupabase";

const runtimeErrors = new WeakMap<Page, string[]>();
test.beforeEach(async ({ page }) => {
  const errors: string[] = [];
  runtimeErrors.set(page, errors);
  page.on("pageerror", (error) => errors.push(error.message));
});
test.afterEach(async ({ page }) => {
  expect(runtimeErrors.get(page)).toEqual([]);
});

test("private links require login and invalid credentials show a useful error", async ({ page }, info) => {
  await mockSupabase(page);
  await page.goto("/medication/new");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeDisabled();
  await page.screenshot({ path: info.outputPath("login.png"), fullPage: true });
  await page.getByLabel("Email", { exact: true }).fill("qa@example.test");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password");
  const dialog = page.waitForEvent("dialog");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  const alert = await dialog;
  expect(alert.message()).toMatch(/email|password|credentials/i);
  await alert.accept();
});

test("offline meal edits survive reload, replay, and can be deleted", async ({ page }, info) => {
  const state = await mockSupabase(page);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await signIn(page);
  await page.screenshot({ path: info.outputPath("home.png"), fullPage: true });
  state.offline = true;
  await page.getByRole("button", { name: "Add food", exact: true }).click();
  await page.getByPlaceholder("e.g. Oatmeal and banana").fill("Offline meal");
  await page.getByRole("button", { name: "Save meal", exact: true }).click();
  await expect(page.getByText("Offline meal", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("Offline meal", { exact: true })).toBeVisible();
  await page.getByText("Offline meal", { exact: true }).click();
  await page.getByPlaceholder("e.g. Oatmeal and banana").fill("Edited offline meal");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect(page.getByText("Edited offline meal", { exact: true })).toBeVisible();
  state.offline = false;
  await expect.poll(() => state.tables.food_entries[0]?.name, { timeout: 30_000 }).toBe("Edited offline meal");
  await page.getByText("Edited offline meal", { exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete meal", exact: true }).click();
  await expect(page.getByText("Edited offline meal", { exact: true })).not.toBeVisible();
  expect(errors).toEqual([]);
});

test("medication form validates required fields and saves a record", async ({ page }, info) => {
  const state = await mockSupabase(page);
  await signIn(page);
  await page.getByRole("button", { name: "Medication", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save medication", exact: true })).toBeDisabled();
  await page.getByLabel("Medication name", { exact: true }).fill("UI test medication");
  await page.getByLabel("Dosage", { exact: true }).fill("10mg");
  await page.screenshot({ path: info.outputPath("medication-form.png"), fullPage: true });
  await page.getByRole("button", { name: "Save medication", exact: true }).click();
  await expect.poll(() => state.tables.medications.some((row) => row.name === "UI test medication")).toBe(true);
  await page.getByRole("tab", { name: "Medications", exact: true }).click();
  // The mounted calendar also contains one label for each scheduled dose.
  await expect(page.getByText("UI test medication", { exact: true }).last()).toBeVisible();
  const id = state.tables.medications.find((row) => row.name === "UI test medication")!.id;
  await page.goto(`/medication/edit/${id}`);
  await page.getByLabel("Medication name", { exact: true }).fill("Updated test medication");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => state.tables.medications.find((row) => row.id === id)?.name).toBe("Updated test medication");
  await page.goto(`/medication/${id}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete medication and its history", exact: true }).click();
  await expect.poll(() => state.tables.medications.some((row) => row.id === id)).toBe(false);
});

test("settings supports Simple Mode and Urdu without horizontal overflow", async ({ page }, info) => {
  await mockSupabase(page);
  await signIn(page);
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await page.getByText("Settings", { exact: true }).click();
  await page.getByRole("switch", { name: "Simple mode", exact: true }).click();
  await page.screenshot({ path: info.outputPath("simple-settings.png"), fullPage: true });
  await page.getByRole("button", { name: "اردو", exact: true }).click();
  await expect(page.getByText("زبان", { exact: true })).toBeVisible();
  const switchFits = await page.getByRole("switch").first().evaluate((el) => {
    const root = el.parentElement!;
    const bounds = root.getBoundingClientRect();
    const thumb = root.children[1].getBoundingClientRect();
    return thumb.left >= bounds.left - 1 && thumb.right <= bounds.right + 1;
  });
  expect(switchFits).toBe(true);
  await page.screenshot({ path: info.outputPath("urdu-settings.png"), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("visit and exercise records can be created, edited, and deleted", async ({ page }, info) => {
  const state = await mockSupabase(page);
  await signIn(page);
  await page.getByRole("button", { name: "Doctor visit", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save doctor visit", exact: true })).toBeDisabled();
  await page.getByLabel("Provider name", { exact: true }).fill("Dr. UI Test");
  await page.getByRole("button", { name: "Save doctor visit", exact: true }).click();
  await expect.poll(() => state.tables.appointments[0]?.provider_name).toBe("Dr. UI Test");
  const id = state.tables.appointments[0].id;
  await page.goto(`/appointment/edit/${id}`);
  await page.getByLabel("Provider name", { exact: true }).fill("Dr. Updated");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => state.tables.appointments[0]?.provider_name).toBe("Dr. Updated");
  await page.goto(`/appointment/edit/${id}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete visit", exact: true }).click();
  await expect.poll(() => state.tables.appointments.length).toBe(0);
  await page.goto("/exercise/new");
  await page.getByLabel("Notes (optional)", { exact: true }).fill("UI walk");
  await page.screenshot({ path: info.outputPath("exercise-form.png"), fullPage: true });
  await page.getByRole("button", { name: "Save activity", exact: true }).click();
  await expect.poll(() => state.tables.exercise_entries.length).toBe(1);
  const exerciseId = state.tables.exercise_entries[0].id;
  await page.goto(`/exercise/${exerciseId}`);
  await page.getByLabel("Notes (optional)", { exact: true }).fill("Updated walk");
  await page.getByRole("button", { name: "Save changes", exact: true }).click();
  await expect.poll(() => state.tables.exercise_entries[0]?.notes).toBe("Updated walk");
  await page.goto(`/exercise/${exerciseId}`);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete activity", exact: true }).click();
  await expect.poll(() => state.tables.exercise_entries.length).toBe(0);
});

test("guardian validation and reminder offline creation work", async ({ page }, info) => {
  const state = await mockSupabase(page);
  await signIn(page);
  await page.goto("/guardian/new");
  await page.getByLabel("Name", { exact: true }).fill("QA Guardian");
  await page.getByLabel("Phone number", { exact: true }).fill("12");
  await expect(page.getByRole("button", { name: "Add guardian", exact: true })).toBeDisabled();
  await page.getByLabel("Phone number", { exact: true }).fill("+923001234567");
  await page.getByRole("button", { name: "Add guardian", exact: true }).click();
  await expect.poll(() => state.tables.guardians[0]?.name).toBe("QA Guardian");
  state.offline = true;
  await page.goto("/reminder/new");
  await expect(page.getByRole("button", { name: "Save reminder", exact: true })).toBeDisabled();
  await page.getByLabel("What should we remind you about?", { exact: true }).fill("QA Blood test");
  await page.screenshot({ path: info.outputPath("reminder-form.png"), fullPage: true });
  await page.getByRole("button", { name: "Save reminder", exact: true }).click();
  await expect(page.getByRole("button", { name: "Save reminder", exact: true })).not.toBeVisible();
  await page.goto("/reminders");
  await expect(page.getByText("QA Blood test", { exact: true }).filter({ visible: true })).toBeVisible();
  await page.reload();
  await expect(page.getByText("QA Blood test", { exact: true }).filter({ visible: true })).toBeVisible();
  state.offline = false;
  await expect.poll(() => state.tables.custom_reminders[0]?.title, { timeout: 30_000 }).toBe("QA Blood test");
  await page.goto("/");
  await page.getByRole("button", { name: "Mark done", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark not done", exact: true })).toBeVisible();
  await expect.poll(() => state.tables.reminder_completions.length).toBe(1);
  await page.getByRole("button", { name: "Mark not done", exact: true }).click();
  await expect(page.getByRole("button", { name: "Mark done", exact: true })).toBeVisible();
  await expect.poll(() => state.tables.reminder_completions.length).toBe(0);
});

test("offline dose answer persists and sign out clears private device records", async ({ page }) => {
  const state = await mockSupabase(page);
  await signIn(page);
  state.offline = true;
  await page.getByRole("button", { name: "Mark taken", exact: true }).click();
  await expect(page.getByRole("button", { name: "Taken", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "Taken", exact: true })).toBeVisible();
  state.offline = false;
  await expect.poll(() => state.tables.dose_logs[0]?.status, { timeout: 30_000 }).toBe("taken");
  await page.reload();
  await expect(page.getByRole("button", { name: "Taken", exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Profile", exact: true }).click();
  await page.getByText("Add family member", { exact: true }).click();
  await page.getByPlaceholder("Family member's name").fill("QA Family");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect.poll(() => state.tables.profiles.length).toBe(2);
  await page.getByText("Settings", { exact: true }).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByText("Sign out", { exact: true }).click();
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
  const storage = await page.evaluate(() => ({ ...localStorage }));
  expect(JSON.stringify(storage)).not.toContain("QA Family");
  expect(JSON.stringify(storage)).not.toContain("Test medicine");
  await page.goto("/medication/new");
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible();
});

test("a refused profile read shows an error and can be retried", async ({ page }) => {
  const state = await mockSupabase(page);
  state.rejectProfiles = true;
  await signIn(page);
  await expect(page.getByRole("button", { name: "Try again", exact: true })).toBeVisible();
  state.rejectProfiles = false;
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add food", exact: true })).toBeVisible();
});

test("dark appearance and narrow forms remain readable", async ({ page }, info) => {
  await mockSupabase(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await signIn(page);
  await page.getByRole("button", { name: "Medication", exact: true }).click();
  await page.getByLabel("Medication name", { exact: true }).fill("A long medication name to check the small screen layout");
  await page.getByLabel("Dosage", { exact: true }).fill("One tablet with water");
  await page.setViewportSize({ width: 320, height: 812 });
  const button = page.getByRole("button", { name: "Save medication", exact: true });
  await expect(button).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  const colors = await button.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el.firstElementChild!).color }));
  function luminance(rgb: string) {
    const values = rgb.match(/[\d.]+/g)!.slice(0, 3).map(Number).map((n) => n / 255);
    return values.map((n) => n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4)
      .reduce((sum, n, i) => sum + n * [0.2126, 0.7152, 0.0722][i], 0);
  }
  const contrast = (a: string, b: string) => (Math.max(luminance(a), luminance(b)) + 0.05) / (Math.min(luminance(a), luminance(b)) + 0.05);
  expect(contrast(colors.bg, colors.fg)).toBeGreaterThanOrEqual(4.5);
  await page.screenshot({ path: info.outputPath("dark-narrow-form.png"), fullPage: true });
  await page.emulateMedia({ colorScheme: "light" });
  const light = await button.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, fg: getComputedStyle(el.firstElementChild!).color }));
  expect(contrast(light.bg, light.fg)).toBeGreaterThanOrEqual(4.5);
});

test("password reset request validates email and returns to sign in", async ({ page }) => {
  await mockSupabase(page);
  await page.goto("/auth/forgot-password");
  await expect(page.getByRole("button", { name: "Send reset link", exact: true })).toBeDisabled();
  await page.getByLabel("Email", { exact: true }).fill("bad-email");
  await expect(page.getByRole("button", { name: "Send reset link", exact: true })).toBeDisabled();
  await page.getByLabel("Email", { exact: true }).fill("qa@example.test");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Send reset link", exact: true }).click();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
});
