"use client";

import { useEffect, useState } from "react";
import type { LogEntry, Status } from "@/lib/store";

const STATUS_COLOR: Record<Status, string> = {
  executed: "#4ade80",
  ignored: "#8b8f98",
  low_confidence: "#facc15",
  cooldown: "#60a5fa",
  rejected: "#fb923c",
  error: "#f87171",
};

const cell = { padding: "8px 12px", borderBottom: "1px solid #1f2228" } as const;

export default function Page() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/commands", { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as LogEntry[];
        if (active) {
          setEntries(data);
          setOnline(true);
        }
      } catch {
        if (active) setOnline(false);
      }
    }
    poll();
    const id = setInterval(poll, 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, []);

  return (
    <main style={{ maxWidth: 960, margin: "0 auto", padding: "32px 16px" }}>
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, margin: 0 }}>EXS — command log</h1>
        <span style={{ fontSize: 13, color: online ? "#4ade80" : "#f87171" }}>
          ● {online === null ? "connecting…" : online ? "server online" : "no connection"}
        </span>
      </header>

      {entries.length === 0 ? (
        <p style={{ color: "#8b8f98", marginTop: 48, textAlign: "center" }}>
          No commands yet. Say a keyword to the board.
        </p>
      ) : (
        <table
          style={{ width: "100%", marginTop: 24, borderCollapse: "collapse", fontSize: 14 }}
        >
          <thead>
            <tr style={{ color: "#8b8f98", textAlign: "left" }}>
              <th style={cell}>Time</th>
              <th style={cell}>Label</th>
              <th style={cell}>Conf.</th>
              <th style={cell}>Status</th>
              <th style={cell}>Detail</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td style={{ ...cell, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
                  {new Date(e.ts).toLocaleTimeString()}
                </td>
                <td style={{ ...cell, fontFamily: "ui-monospace, monospace" }}>{e.label}</td>
                <td style={{ ...cell, fontVariantNumeric: "tabular-nums" }}>
                  {Math.round(e.confidence * 100)}%
                </td>
                <td style={{ ...cell, color: STATUS_COLOR[e.status], whiteSpace: "nowrap" }}>
                  ● {e.status}
                </td>
                <td style={{ ...cell, color: "#b4b8c0" }}>{e.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
