const USER_ID = "demo-user";

function headers(extra = {}) {
  return {
    "Content-Type": "application/json",
    "x-user-id": USER_ID,
    ...extra,
  };
}

async function request(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: headers(options.headers),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(text || `Request failed: ${res.status}`);
  }

  return res.json();
}

// Profile
export const profileApi = {
  get: () => request("/api/profile"),
  save: (data) =>
    request("/api/profile", { method: "POST", body: JSON.stringify(data) }),
};

// Dashboard
export const dashboardApi = {
  get: (fy) => request(`/api/dashboard?fy=${fy}`),
};

// Income
export const incomeApi = {
  list: (fy) => request(`/api/income?fy=${fy}`),
  create: (data) =>
    request("/api/income", { method: "POST", body: JSON.stringify(data) }),
  update: (data) =>
    request("/api/income", { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) => request(`/api/income?id=${id}`, { method: "DELETE" }),
};

// Invoices
export const invoicesApi = {
  list: (fy) => request(`/api/invoices?fy=${fy}`),
  create: (data) =>
    request("/api/invoices", { method: "POST", body: JSON.stringify(data) }),
  update: (data) =>
    request("/api/invoices", { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) => request(`/api/invoices?id=${id}`, { method: "DELETE" }),
};

// Expenses
export const expensesApi = {
  list: (fy) => request(`/api/expenses?fy=${fy}`),
  create: (data) =>
    request("/api/expenses", { method: "POST", body: JSON.stringify(data) }),
  update: (data) =>
    request("/api/expenses", { method: "PUT", body: JSON.stringify(data) }),
  remove: (id) => request(`/api/expenses?id=${id}`, { method: "DELETE" }),
};

// GST
export const gstApi = {
  status: (fy) => request(`/api/gst/status?fy=${fy}`),
};

// Tax
export const taxApi = {
  estimate: (fy) => request(`/api/tax/estimate?fy=${fy}`),
};

// TDS
export const tdsApi = {
  list: (fy) => request(`/api/tds?fy=${fy}`),
  create: (data) =>
    request("/api/tds", { method: "POST", body: JSON.stringify(data) }),
  remove: (id) => request(`/api/tds?id=${id}`, { method: "DELETE" }),
};
