// frontend/ai-doc-frontend/src/components/api.js
import axios from "axios";
import { API_BASE_URL } from "../config";

export const api = axios.create({
  baseURL: API_BASE_URL, // ✅ this already has /api/v1
});
