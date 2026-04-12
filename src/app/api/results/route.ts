import { NextResponse } from "next/server";

export async function POST(request: Request) {
  // TODO: Endergebnis in PostgreSQL speichern
  const body = await request.json();
  return NextResponse.json({ success: true, data: body }, { status: 201 });
}
