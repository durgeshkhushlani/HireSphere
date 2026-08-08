import { getResumeUploadSignature } from "@/lib/api/students";

// Signed direct upload: the browser sends the file straight to Cloudinary
// using a short-lived signature from our backend (lib/cloudinary.js) — the
// file itself never passes through our server.
export async function uploadResumeToCloudinary(file: File, token: string): Promise<string> {
  const sig = await getResumeUploadSignature(token);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("api_key", sig.apiKey);
  formData.append("timestamp", String(sig.timestamp));
  formData.append("signature", sig.signature);
  formData.append("public_id", sig.publicId);
  formData.append("overwrite", "true");

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/raw/upload`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error?.message || "Resume upload failed");
  }

  const data = (await res.json()) as { secure_url: string };
  return data.secure_url;
}
