import axios from "axios"

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
})

api.interceptors.request.use((config) => {
  config.withCredentials = true
  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && typeof window !== "undefined") {
      if (window.location.pathname !== "/auth") {
        window.location.href = "/auth"
      }
    }

    return Promise.reject(error)
  }
)

export default api
