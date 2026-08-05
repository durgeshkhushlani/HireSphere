const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  token?: string | null;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message = (data && typeof data === "object" && "error" in data
      ? String((data as { error: unknown }).error)
      : res.statusText) || "Something went wrong";
    throw new ApiError(res.status, message);
  }

  return data as T;
}

// For binary downloads (e.g. the Excel export) — apiFetch always JSON.parses
// the body, which corrupts binary data, so this reads a Blob instead and
// also surfaces the server-suggested filename from Content-Disposition.
export async function apiFetchBlob(
  path: string,
  options: RequestOptions = {}
): Promise<{ blob: Blob; filename: string | null }> {
  const res = await fetch(`${API_URL}${path}`, {
    method: options.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    const data = text ? JSON.parse(text) : undefined;
    const message = (data && typeof data === "object" && "error" in data
      ? String((data as { error: unknown }).error)
      : res.statusText) || "Something went wrong";
    throw new ApiError(res.status, message);
  }

  const disposition = res.headers.get("Content-Disposition");
  const match = disposition ? /filename="?([^"]+)"?/.exec(disposition) : null;
  return { blob: await res.blob(), filename: match ? match[1] : null };
}
