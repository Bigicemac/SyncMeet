const getApiUrl = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (
    envUrl &&
    !envUrl.includes("localhost") &&
    !envUrl.includes("127.0.0.1")
  ) {
    return envUrl;
  }
  // Automatically match the current hostname (e.g. 10.50.58.22 or localhost) on port 4000
  const host =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "localhost";
  return `http://${host}:4000`;
};

export const API = getApiUrl();

export async function request(path, { method = "GET", body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Request failed");
  return data;
}
