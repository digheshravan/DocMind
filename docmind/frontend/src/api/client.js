import axios from 'axios'

const client = axios.create({
    baseURL: '/api',
    timeout: 120_000, // 2 min for long AI operations
    headers: {
        'Content-Type': 'application/json',
    },
})

// Response interceptor: normalize errors
client.interceptors.response.use(
    (response) => response,
    (error) => {
        const message =
            error.response?.data?.detail ||
            error.response?.data?.message ||
            error.message ||
            'An unexpected error occurred'
        return Promise.reject(new Error(message))
    }
)

export default client
