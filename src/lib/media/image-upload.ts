"use client";

import { isUuid } from "@/lib/repository/supabase-sync";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export async function compressImageFile(
  file: File,
  maxDim = 1400,
  quality = 0.82
): Promise<{ blob: Blob; dataUrl: string }> {
  const dataUrlRaw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Không đọc được file ảnh."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("File ảnh không hợp lệ."));
    el.src = dataUrlRaw;
  });

  let { width, height } = img;
  if (width > maxDim || height > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { blob: file, dataUrl: dataUrlRaw };
  }
  ctx.drawImage(img, 0, 0, width, height);

  const mime = file.type === "image/png" ? "image/png" : "image/jpeg";
  const dataUrl = canvas.toDataURL(mime, quality);
  const blob = await new Promise<Blob>((resolve) => {
    canvas.toBlob((b) => resolve(b ?? file), mime, quality);
  });

  return { blob, dataUrl };
}

/**
 * Compresses the image and uploads to Supabase Storage bucket `note-media` when signed in.
 * Falls back transparently to compressed dataUrl if Guest or if the Storage bucket isn't created yet.
 */
export async function uploadNoteImage(
  file: File,
  cloudUserId: string | null
): Promise<string> {
  const { blob, dataUrl } = await compressImageFile(file);

  const supabase = getSupabaseBrowserClient();
  if (supabase && cloudUserId && isUuid(cloudUserId)) {
    try {
      const ext = file.type === "image/png" ? "png" : "jpg";
      const filePath = `${cloudUserId}/${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 7)}.${ext}`;
      const { error } = await supabase.storage
        .from("note-media")
        .upload(filePath, blob, {
          contentType: file.type === "image/png" ? "image/png" : "image/jpeg",
          upsert: false,
        });
      if (!error) {
        const { data } = supabase.storage
          .from("note-media")
          .getPublicUrl(filePath);
        if (data?.publicUrl) return data.publicUrl;
      }
    } catch {
      // Fallback cleanly to dataUrl
    }
  }

  return dataUrl;
}
