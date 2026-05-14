const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

function getToken() {
  return localStorage.getItem("cssd_token");
}

async function request(method, path, body = null) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const options = { method, headers };
  if (body !== null) options.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, options);

  if (res.status === 401) {
    localStorage.removeItem("cssd_token");
    localStorage.removeItem("cssd_user");
    window.location.href = "/login";
    throw new Error("Session expired. Please log in again.");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || "Request failed");
  }
  return res.json();
}

function buildQS(params) {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null && v !== ""))
  ).toString();
  return qs ? `?${qs}` : "";
}

export const api = {
  // Auth
  login: (username, password) =>
    request("POST", "/auth/login", { username, password }),

  me: () =>
    request("GET", "/auth/me"),

  // Users (admin)
  getUsers: () =>
    request("GET", "/users"),

  createUser: (data) =>
    request("POST", "/users", data),

  updateUser: (id, data) =>
    request("PATCH", `/users/${id}`, data),

  resetPassword: (id, new_password) =>
    request("POST", `/users/${id}/reset-password`, { new_password }),

  toggleUserActive: (id) =>
    request("PATCH", `/users/${id}/toggle-active`),

  // Transactions
  createTransaction: (data) =>
    request("POST", "/transactions", data),

  getTransactions: (params = {}) =>
    request("GET", `/transactions${buildQS(params)}`),

  getTransaction: (id) =>
    request("GET", `/transactions/${id}`),

  getTransactionDetail: (id) =>
    request("GET", `/transactions/${id}/detail`),

  updateStatus: (id, status) =>
    request("PATCH", `/transactions/${id}/status`, { status }),

  dispatchTransaction: (id, data) =>
    request("POST", `/transactions/${id}/dispatch`, data),

  getStats: () =>
    request("GET", "/stats"),

  getAuditLogs: (params = {}) =>
    request("GET", `/audit-logs${buildQS(params)}`),

  getTransactionAuditLogs: (id) =>
    request("GET", `/transactions/${id}/audit-logs`),
};
