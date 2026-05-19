import axios from "axios";
import { setupInterceptors } from "./interceptors";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

setupInterceptors(api);

export default api;
