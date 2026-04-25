import axios, { AxiosInstance } from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

const apiClient: AxiosInstance = axios.create({
    baseURL: API_BASE_URL,
    withCredentials: true, // session cookie is HTTPOnly + same-origin in prod
    headers: { 'Content-Type': 'application/json' },
})

// Surface 401s to the auth store via a custom event. App.tsx subscribes and
// flips the store to unauthenticated; the router redirects to /login.
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'))
        }
        return Promise.reject(error)
    },
)

export default apiClient
