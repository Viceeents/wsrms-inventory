export async function api(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  }).catch((error) => {
    if (error.name === "AbortError") throw error;
    throw new Error(
      "Could not connect to the system. Check your connection and try again.",
    );
  });
  const result = await response
    .json()
    .catch(() => ({ message: "The server returned an unexpected response." }));
  if (!response.ok) {
    const error = new Error(result.message || "Request failed.");
    error.status = response.status;
    if (response.status === 401 && !path.startsWith("/auth"))
      window.dispatchEvent(new Event("session-expired"));
    throw error;
  }
  return result;
}
export const queryString = (params) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== "" && v != null),
  );
  return q.size ? `?${q}` : "";
};
