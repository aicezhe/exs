import { NextResponse } from "next/server";
import { getEntries } from "@/lib/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(getEntries(50));
}
