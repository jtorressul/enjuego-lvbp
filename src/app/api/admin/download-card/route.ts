import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const dataUrl = String(formData.get("dataUrl") || "");
    const rawFilename = String(formData.get("filename") || "enjuego-arte.png");
    const safeFilename = rawFilename.replace(/[^a-zA-Z0-9._-]/g, "_");

    const match = dataUrl.match(/^data:image\/(png|jpeg|webp);base64,(.+)$/);
    if (!match) {
      return NextResponse.json({ error: "Formato de imagen inválido" }, { status: 400 });
    }

    const base64Data = match[2];
    const binaryStr = atob(base64Data);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Disposition": `attachment; filename="${safeFilename}"`,
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "No se pudo procesar la descarga", detail: String(err) },
      { status: 500 }
    );
  }
}
