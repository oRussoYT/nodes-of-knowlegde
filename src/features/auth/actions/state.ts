// Action-state types and initial values for src/features/auth/actions/*.
//
// Next.js requires every export from a "use server" module to be an async
// function (see https://nextjs.org/docs/messages/invalid-use-server-value)
// — a plain object or a non-async value fails at runtime with "A 'use
// server' file can only export async functions, found object." Each action
// below needs its state *type* (for its own function signature) and an
// *initial* state value (for the Client Component that calls
// `useActionState`), and a plain object literal like `{ status: "idle" }`
// is exactly the kind of export that isn't allowed to live in a "use
// server" file. This module holds every one of those types/initial values
// instead, so every file in this directory that has "use server" at the
// top exports nothing but its async Server Action(s).
//
// Do not add "use server" to this file, and do not export anything from
// here that isn't a type or a plain constant.

import type { FieldErrors } from "@/lib/auth/validation";

export interface RegisterActionState {
  status: "idle" | "error" | "success";
  formError?: string;
  fieldErrors?: FieldErrors;
  /** Set on success so the UI can offer a scoped "resend" without asking again. */
  email?: string;
}

export const initialRegisterState: RegisterActionState = { status: "idle" };

export interface LoginActionState {
  status: "idle" | "error";
  formError?: string;
  fieldErrors?: FieldErrors;
}

export const initialLoginState: LoginActionState = { status: "idle" };

export interface ForgotPasswordActionState {
  status: "idle" | "error" | "success";
  fieldErrors?: FieldErrors;
}

export const initialForgotPasswordState: ForgotPasswordActionState = { status: "idle" };

export interface ResendConfirmationActionState {
  status: "idle" | "error" | "success";
  fieldErrors?: FieldErrors;
  /**
   * Distinct per successful call, so the client can restart its cooldown
   * timer on a *second* resend too — see
   * src/components/auth/ResendConfirmationForm.tsx. Not a security token
   * of any kind, just a remount key.
   */
  nonce?: number;
}

export const initialResendConfirmationState: ResendConfirmationActionState = { status: "idle" };

export interface UpdatePasswordActionState {
  status: "idle" | "error" | "success";
  formError?: string;
  fieldErrors?: FieldErrors;
}

export const initialUpdatePasswordState: UpdatePasswordActionState = { status: "idle" };
