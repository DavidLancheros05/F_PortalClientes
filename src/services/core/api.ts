import axios from "axios";
import { setupInterceptors } from "./interceptors";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

setupInterceptors(api);

export default api;