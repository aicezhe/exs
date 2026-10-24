import { randomUUID } from "node:crypto";

export type Status =
  | "executed"
  | "ignored"
  | "low_confidence"
  | "cooldown"
  | "rejected"
  | "error";

export type LogEntry = {
  id: string;
  ts: string;
  label: string;
  confidence: number;
  status: Status;
  detail: string;
};

const MAX_ENTRIES = 200;

type Store = {
  log: LogEntry[];
  lastRun: Map<string, number>;
};

// Kept on globalThis so the log survives Next.js hot reload in dev.
const g = globalThis as typeof globalThis & { __exsStore?: Store };
const store: Store = (g.__exsStore ??= { log: [], lastRun: new Map() });

export function addEntry(entry: Omit<LogEntry, "id" | "ts">): LogEntry {
  const full: LogEntry = { id: randomUUID(), ts: new Date().toISOString(), ...entry };
  store.log.push(full);
  if (store.log.length > MAX_ENTRIES) store.log.splice(0, store.log.length - MAX_ENTRIES);
  return full;
}

/** Newest first. */
export function getEntries(limit: number): LogEntry[] {
  return store.log.slice(-limit).reverse();
}

export function getLastRun(label: string): number | undefined {
  return store.lastRun.get(label);
}

export function setLastRun(label: string, time: number): void {
  store.lastRun.set(label, time);
}
