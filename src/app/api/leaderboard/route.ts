import { NextResponse } from "next/server";

export async function GET() {
  // TODO: Rangliste aus PostgreSQL laden
  return NextResponse.json({ leaderboard: [] });
}
