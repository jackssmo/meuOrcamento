import axios from "axios";

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const apiBaseUrl = configuredApiUrl || "/api";

export const api = axios.create({
  baseURL: apiBaseUrl.replace(/\/+$/, ""),
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("fintrack_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes("/auth/login");
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem("fintrack_token");
      if (window.location.pathname !== "/login") window.location.assign("/login");
    } else if (error.code === "ECONNABORTED" || error.code === "ERR_NETWORK") {
      console.error("Não foi possível conectar à API.", error.message);
    }
    return Promise.reject(error);
  },
);
