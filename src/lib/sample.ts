/**
 * Sample-data isolation.
 *
 * The "Try sample data" demo must never be mistaken for a user's real
 * transactions. Rather than tag every transaction with a flag (which would
 * bloat the core type and wouldn't help data already saved before tagging
 * existed), we identify sample rows by their fixed demo transaction codes.
 *
 * This lets us: detect when the demo is present, strip it out when real data is
 * imported, and offer a one-tap "remove sample" action.
 */
import type { Transaction } from "./parser/types";
import { parseMessages } from "./parser/index";
import { SAMPLE_MESSAGES } from "../data/sampleMessages";

/** The transaction codes that belong to the built-in sample dataset. */
export const SAMPLE_REFS: ReadonlySet<string> = new Set(
  parseMessages(SAMPLE_MESSAGES)
    .transactions.map((t) => t.ref)
    .filter((ref): ref is string => ref.length > 0),
);

/** Is this transaction part of the built-in demo dataset? */
export function isSampleTxn(t: Transaction): boolean {
  return t.ref.length > 0 && SAMPLE_REFS.has(t.ref);
}

/** Does the set contain any demo transactions? */
export function hasSample(txns: Transaction[]): boolean {
  return txns.some(isSampleTxn);
}

/** Return only the real (non-demo) transactions. */
export function stripSample(txns: Transaction[]): Transaction[] {
  return txns.filter((t) => !isSampleTxn(t));
}
