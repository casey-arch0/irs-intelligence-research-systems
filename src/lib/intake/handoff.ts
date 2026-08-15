import type { IntakeResult } from "./types";

/**
 * In-memory hand-off between an intake surface (e.g. the homepage) and the
 * /analyze workspace. Deliberately not persisted: source text never leaves
 * the tab's memory.
 */
let pending: IntakeResult | null = null;

export function setPendingIntake(result: IntakeResult) {
  pending = result;
}

export function takePendingIntake(): IntakeResult | null {
  const value = pending;
  pending = null;
  return value;
}
