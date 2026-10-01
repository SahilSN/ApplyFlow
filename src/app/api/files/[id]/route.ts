import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!["localhost", "127.0.0.1", "[::1]"].includes(req.nextUrl.hostname))
    return new NextResponse("Forbidden", { status: 403 });
  const { id } = await params;
  const file = db()
    .prepare("SELECT filename,mime,bytes FROM versions WHERE id=?")
    .get(id);
  if (!file) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(new Uint8Array(file.bytes as Uint8Array), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(String(file.filename))}`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
}
