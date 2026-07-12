import axios from "axios";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8000";

const client = axios.create({ baseURL: API_BASE });

client.interceptors.request.use((config) => {
  const token = localStorage.getItem("sentrychain_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response && err.response.status === 401) {
      localStorage.removeItem("sentrychain_token");
      localStorage.removeItem("sentrychain_user");
      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
    return Promise.reject(err);
  }
);

export async function login(username, password) {
  const form = new URLSearchParams();
  form.append("username", username);
  form.append("password", password);
  const res = await client.post("/api/auth/login", form, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });
  return res.data;
}

export const getSummary = () => client.get("/api/summary").then((r) => r.data);
export const getApplications = () => client.get("/api/applications").then((r) => r.data);
export const getApplication = (id) => client.get(`/api/applications/${id}`).then((r) => r.data);
export const getAppDependencies = (id) =>
  client.get(`/api/applications/${id}/dependencies`).then((r) => r.data);
export const getAppGraph = (id) => client.get(`/api/applications/${id}/graph`).then((r) => r.data);
export const getEvaluation = () => client.get("/api/evaluation").then((r) => r.data);
export const getVulnerabilities = () => client.get("/api/vulnerabilities").then((r) => r.data);

export async function downloadAppReport(appId, appName) {
  const res = await client.get(`/api/applications/${appId}/report`, { responseType: "blob" });
  triggerDownload(res.data, `${appName.replace(/\s+/g, "_")}_risk_report.pdf`);
}

export async function downloadOrgReport() {
  const res = await client.get("/api/reports/organization", { responseType: "blob" });
  triggerDownload(res.data, "org_supply_chain_risk_report.pdf");
}

function triggerDownload(blobData, filename) {
  const blob = new Blob([blobData], { type: "application/pdf" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default client;
