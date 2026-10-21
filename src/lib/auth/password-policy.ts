// Single source of truth for this app's password policy.
//
// This MUST stay in sync with `supabase/config.toml`'s `[auth]` section —
// `minimum_password_length` and `password_requirements` — by hand, since
// the CLI config file and this TypeScript module can't share a value at
// build time. Both sides carry a comment pointing at the other. If you
// change one, change the other and re-read
// docs/authentication-implementation.md, "Password policy".
//
// `src/lib/auth/validation.ts` (server + client-shared validation) and
// every form's hint text (`PASSWORD_POLICY_HINT`) both read from here, so
// the rule can't drift between what the UI promises and what the server
// enforces — see tests/unit/password-policy.test.ts.
export const PASSWORD_POLICY = {
  /** Mirrors supabase/config.toml [auth] minimum_password_length. */
  minLength: 8,
  /**
   * Not a Supabase-configurable value — GoTrue/bcrypt only considers the
   * first 72 bytes of a password and silently truncates beyond that. This
   * app rejects an over-long password outright instead, which is less
   * confusing than a silent truncation. There is nothing in
   * supabase/config.toml to keep this in sync with.
   */
  maxLength: 72,
  /**
   * Mirrors supabase/config.toml [auth] password_requirements =
   * "letters_digits" — GoTrue's own wording for this rule is "Password must
   * contain at least one letter and one number."
   */
  requireLetterAndDigit: true,
} as const;

export const PASSWORD_POLICY_HINT = PASSWORD_POLICY.requireLetterAndDigit
  ? `At least ${PASSWORD_POLICY.minLength} characters, including a letter and a number.`
  : `At least ${PASSWORD_POLICY.minLength} characters.`;
