import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  filesFromFormData,
  saveUploadFiles,
  UploadError,
} from "@/lib/uploads";

/**
 * POST /api/uploads
 * Multipart upload (auth required). Returns saved file metadata.
 * Prefer attaching files via task/progress Server Actions when possible.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Tidak terautentikasi." }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const files = filesFromFormData(formData);
    if (files.length === 0) {
      return NextResponse.json(
        { error: "Tidak ada file yang diunggah." },
        { status: 400 },
      );
    }
    if (files.length > 10) {
      return NextResponse.json(
        { error: "Maksimal 10 file per unggahan." },
        { status: 400 },
      );
    }

    const saved = await saveUploadFiles(files);
    return NextResponse.json({ files: saved });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("upload POST error", err);
    return NextResponse.json(
      { error: "Gagal mengunggah file." },
      { status: 500 },
    );
  }
}
