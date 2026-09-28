import test from "node:test";
import assert from "node:assert/strict";
import { parseAuthLink } from "../src/features/auth/parseAuthLink";

test("email confirmation fragment restores a session and opens onboarding", () => {
  assert.deepEqual(parseAuthLink("mediulr://auth/callback?flow=signup#access_token=a&refresh_token=r&type=signup"),
    { kind: "session", accessToken: "a", refreshToken: "r", recovery: false, newAccount: true });
});

test("password recovery handles code and token-hash links", () => {
  assert.deepEqual(parseAuthLink("mediulr://auth/callback?flow=recovery&code=abc"),
    { kind: "code", code: "abc", recovery: true, newAccount: false });
  assert.deepEqual(parseAuthLink("mediulr://auth/callback?token_hash=abc&type=recovery"),
    { kind: "otp", tokenHash: "abc", type: "recovery", recovery: true, newAccount: false });
});

test("auth callback rejects failed and incomplete links", () => {
  assert.throws(() => parseAuthLink("mediulr://auth/callback?error_description=Link%20expired"), /Link expired/);
  assert.throws(() => parseAuthLink("mediulr://auth/callback"), /incomplete/);
});
