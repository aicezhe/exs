import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { IGNORED_LABELS, isKnownAction, runAction } from "@/lib/actions";
import { addEntry, getLastRun, setLastRun } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function numberEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return process.env[name] !== undefined && Number.isFinite(value) ? value : fallback;
}

function tokenMatches(given: string | null, expected: string): boolean {
  if (given === null) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  const token = process.env.COMMAND_TOKEN;
  if (!token || !tokenMatches(req.headers.get("x-api-key"), token)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const { label, confidence } = (body ?? {}) as { label?: unknown; confidence?: unknown };
  if (
    typeof label !== "string" ||
    label.length === 0 ||
    label.length > 64 ||
    typeof confidence !== "number" ||
    !Number.isFinite(confidence) ||
    confidence < 0 ||
    confidence > 1
  ) {
    return NextResponse.json(
      { error: "expected { label: string, confidence: number 0..1 }" },
      { status: 400 },
    );
  }

  const dryRun = process.env.DRY_RUN !== "false";
  const minConfidence = numberEnv("MIN_CONFIDENCE", 0.8);
  const cooldownMs = numberEnv("COOLDOWN_MS", 3000);

  if (IGNORED_LABELS.has(label)) {
    const e = addEntry({ label, confidence, status: "ignored", detail: "noise label" });
    return NextResponse.json({ executed: false, status: e.status, detail: e.detail });
  }

  if (!isKnownAction(label)) {
    const e = addEntry({ label, confidence, status: "rejected", detail: "label not in whitelist" });
    return NextResponse.json(
      { executed: false, status: e.status, detail: e.detail },
      { status: 400 },
    );
  }

  if (confidence < minConfidence) {
    const e = addEntry({
      label,
      confidence,
      status: "low_confidence",
      detail: `below threshold ${minConfidence}`,
    });
    return NextResponse.json({ executed: false, status: e.status, detail: e.detail });
  }

  const now = Date.now();
  const last = getLastRun(label);
  if (last !== undefined && now - last < cooldownMs) {
    const e = addEntry({
      label,
      confidence,
      status: "cooldown",
      detail: `last run ${now - last} ms ago (cooldown ${cooldownMs} ms)`,
    });
    return NextResponse.json({ executed: false, status: e.status, detail: e.detail });
  }

  // Set before running so two quick requests can't both pass the cooldown.
  setLastRun(label, now);
  try {
    const detail = await runAction(label, dryRun);
    const e = addEntry({ label, confidence, status: "executed", detail });
    return NextResponse.json({ executed: true, dryRun, status: e.status, detail: e.detail });
  } catch (err) {
    console.error(`[command] action "${label}" failed:`, err);
    const detail = err instanceof Error ? err.message : String(err);
    const e = addEntry({ label, confidence, status: "error", detail });
    return NextResponse.json(
      { executed: false, status: e.status, detail: e.detail },
      { status: 500 },
    );
  }
}
