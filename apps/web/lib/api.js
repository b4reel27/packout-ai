const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || "";
export const API_URL = rawApiUrl.replace(/\/$/, "");

export async function apiFetch(path, options = {}) {
  if (!API_URL) {
    throw new Error("NEXT_PUBLIC_API_URL is not set.");
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    cache: "no-store",
  });

  const text = await response.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`API returned invalid JSON for ${path}`);
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || "Request failed");
  }

  return data;
}

export function currency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));
}

export function fmtDate(value) {
  if (!value) return "Now";
  try {
    return new Date(value).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });
  } catch {
    return value;
  }
}
