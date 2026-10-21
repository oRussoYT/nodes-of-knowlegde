// Action-state types and initial values for src/features/identity/actions/*
// — same rationale as src/features/auth/actions/state.ts: "use server"
// files may only export async functions, so every type/initial-value
// export lives here instead.

import type { FieldErrors } from "@/lib/auth/validation";
import type { ClaimablePerson } from "../types";

export interface SearchPeopleActionState {
  status: "idle" | "error" | "success";
  query?: string;
  results?: ClaimablePerson[];
  error?: string;
}

export const initialSearchPeopleState: SearchPeopleActionState = { status: "idle" };

export interface SubmitClaimActionState {
  status: "idle" | "error" | "success";
  formError?: string;
  fieldErrors?: FieldErrors;
}

export const initialSubmitClaimState: SubmitClaimActionState = { status: "idle" };

export interface WithdrawClaimActionState {
  status: "idle" | "error" | "success";
  formError?: string;
}

export const initialWithdrawClaimState: WithdrawClaimActionState = { status: "idle" };
