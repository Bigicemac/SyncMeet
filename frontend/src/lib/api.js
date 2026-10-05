const getApiUrl = () => {
  const envUrl =
    import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
  if (
    envUrl &&
    !envUrl.includes("localhost") &&
    !envUrl.includes("127.0.0.1")
  ) {
    return envUrl;
  }

  const host =
    typeof window !== "undefined" && window.location.hostname
      ? window.location.hostname
      : "localhost";

  if (host.includes("onrender.com")) {
    return "https://syncmeet-96uj.onrender.com";
  }

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
