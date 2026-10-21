// Action-state types and initial values for src/features/review/actions/*
// -- same rationale as src/features/identity/actions/state.ts: "use
// server" files may only export async functions, so every type/initial-
// value export lives here instead.

import type { FieldErrors } from "@/lib/auth/validation";

export interface BeginReviewActionState {
  status: "idle" | "error" | "success";
  formError?: string;
}

export const initialBeginReviewState: BeginReviewActionState = { status: "idle" };

export interface ApproveClaimActionState {
  status: "idle" | "error" | "success";
  formError?: string;
}

export const initialApproveClaimState: ApproveClaimActionState = { status: "idle" };

export interface RejectClaimActionState {
  status: "idle" | "error" | "success";
  formError?: string;
  fieldErrors?: FieldErrors;
}

export const initialRejectClaimState: RejectClaimActionState = { status: "idle" };
