import { randomUUID } from "node:crypto";
import {
  createSupabaseServiceClient,
  isSupabaseServiceConfigured,
} from "@/lib/supabase/service";
import {
  PROJECT_IMAGE_BUCKET,
  PROJECT_LIMITS,
} from "@/lib/projects/schema";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

export type UploadProjectImageResult =
  | { ok: true; url: string; path: string }
  | {
      ok: false;
      reason:
        | "not_configured"
        | "invalid_type"
        | "too_large"
        | "upload_failed";
    };

export async function uploadProjectImage(
  file: File
): Promise<UploadProjectImageResult> {
  if (!isSupabaseServiceConfigured()) {
    return { ok: false, reason: "not_configured" };
  }

  const mime = file.type;
  if (!(PROJECT_LIMITS.allowedMime as readonly string[]).includes(mime)) {
    return { ok: false, reason: "invalid_type" };
  }

  if (file.size <= 0 || file.size > PROJECT_LIMITS.uploadMaxBytes) {
    return { ok: false, reason: "too_large" };
  }

  const supabase = createSupabaseServiceClient();
  if (!supabase) return { ok: false, reason: "not_configured" };

  const ext = EXT_BY_MIME[mime] ?? "bin";
  const path = `projects/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(PROJECT_IMAGE_BUCKET)
    .upload(path, buffer, {
      contentType: mime,
      upsert: false,
      cacheControl: "31536000",
    });

  if (error) {
    console.error("[projects] upload", error.message);
    return { ok: false, reason: "upload_failed" };
  }

  const { data } = supabase.storage
    .from(PROJECT_IMAGE_BUCKET)
    .getPublicUrl(path);

  return { ok: true, url: data.publicUrl, path };
}

export async function deleteProjectImageByUrl(
  url: string
): Promise<boolean> {
  if (!isSupabaseServiceConfigured()) return false;
  const supabase = createSupabaseServiceClient();
  if (!supabase) return false;

  try {
    const marker = `/object/public/${PROJECT_IMAGE_BUCKET}/`;
    const idx = url.indexOf(marker);
    if (idx === -1) return false;
    const path = decodeURIComponent(url.slice(idx + marker.length));
    if (!path || path.includes("..")) return false;

    const { error } = await supabase.storage
      .from(PROJECT_IMAGE_BUCKET)
      .remove([path]);
    return !error;
  } catch {
    return false;
  }
}
