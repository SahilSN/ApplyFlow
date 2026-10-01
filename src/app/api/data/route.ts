import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { getState, mutate, uploadDocument, InputError } from "@/lib/service";
import { backup, restore } from "@/lib/backup";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function local(req: NextRequest) {
  const requestOrigin = new URL(
    `${req.nextUrl.protocol}//${req.headers.get("host") || req.nextUrl.host}`,
  );
  const host = requestOrigin.hostname;
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host))
    throw new InputError("ApplyFlow only accepts local requests", 403);
  const origin = req.headers.get("origin");
  if (origin && origin !== requestOrigin.origin)
    throw new InputError("Cross-origin access denied", 403);
}
function failure(error: unknown) {
  if (error instanceof ZodError)
    return NextResponse.json(
      {
        error: error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      },
      { status: 400 },
    );
  if (error instanceof InputError)
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: error.status },
    );
  console.error(error);
  return NextResponse.json(
    { error: "The operation failed. Your changes were not saved." },
    { status: 500 },
  );
}
export async function GET(req: NextRequest) {
  try {
    local(req);
    if (req.nextUrl.searchParams.get("export") === "backup")
      return NextResponse.json(backup(), {
        headers: {
          "Content-Disposition": 'attachment; filename="applyflow-backup.json"',
          "Cache-Control": "no-store",
        },
      });
    return NextResponse.json(getState(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: NextRequest) {
  try {
    local(req);
    const length = Number(req.headers.get("content-length") || 0);
    if (length > 100 * 1024 * 1024)
      throw new InputError("Request is too large", 413);
    let result;
    if (req.headers.get("content-type")?.includes("multipart/form-data"))
      result = await uploadDocument(await req.formData());
    else {
      const { action, payload } = await req.json();
      result =
        action === "restore" ? restore(payload) : mutate(action, payload);
    }
    return NextResponse.json({ result });
  } catch (e) {
    return failure(e);
  }
}
