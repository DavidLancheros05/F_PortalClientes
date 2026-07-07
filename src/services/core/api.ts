import axios from "axios";
import { setupInterceptors } from "./interceptors";

const backendUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const baseURL = `${backendUrl}/api`;

const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

setupInterceptors(api);

export default api;