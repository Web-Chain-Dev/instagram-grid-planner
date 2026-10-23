import { supabase } from "@/integrations/supabase/client";

const BUCKET = "media";
const SIGNED_TTL = 60 * 60 * 24 * 7;

/** Values in the DB are either storage paths or absolute URLs (e.g. from future importers). */
export function isUrl(v: string) {
  return /^https?:\/\//.test(v) || v.startsWith("blob:") || v.startsWith("data:");
}

export async function resolveUrls(values: (string | null | undefined)[]): Promise<Map<string, string>> {
  const paths = Array.from(new Set(values.filter((v): v is string => !!v && !isUrl(v))));
  const map = new Map<string, string>();
  values.forEach((v) => v && isUrl(v) && map.set(v, v));
  if (!paths.length) return map;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, SIGNED_TTL);
  if (error) throw error;
  data?.forEach((d) => d.path && d.signedUrl && map.set(d.path, d.signedUrl));
  return map;
}

export async function uploadFile(userId: string, file: Blob, ext: string): Promise<string> {
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function removeFiles(values: (string | null | undefined)[]) {
  const paths = values.filter((v): v is string => !!v && !isUrl(v));
  if (paths.length) await supabase.storage.from(BUCKET).remove(paths);
}

export function extOf(file: File) {
  const fromName = file.name.split(".").pop();
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  return file.type.split("/")[1] ?? "bin";
}

export const isVideo = (f: File) => f.type.startsWith("video/");

/** Grab a frame from a video file to use as its grid cover. */
export function videoThumbnail(file: File, at = 0.5): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    v.onloadeddata = () => {
      v.currentTime = Math.min(at, (v.duration || 1) / 2);
    };
    v.onseeked = () => {
      const c = document.createElement("canvas");
      c.width = v.videoWidth;
      c.height = v.videoHeight;
      c.getContext("2d")?.drawImage(v, 0, 0);
      c.toBlob(
        (b) => {
          URL.revokeObjectURL(url);
          b ? resolve(b) : reject(new Error("thumbnail failed"));
        },
        "image/jpeg",
        0.85,
      );
    };
    v.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read video"));
    };
  });
}
