import axios, { InternalAxiosRequestConfig, AxiosRequestConfig } from 'axios'
import { withRetry } from '@/lib/backend-warmup'

// Extend axios config type to include retry options
interface RetryConfig {
  maxRetries?: number
  baseDelay?: number
  onRetry?: (attempt: number, error: any) => void
}

interface ExtendedAxiosConfig extends InternalAxiosRequestConfig {
  retryConfig?: RetryConfig
  _retry?: boolean
}

const API_BASE_URL = ''

// Create axios instance with base configuration
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add retry interceptor for cold starts
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig): InternalAxiosRequestConfig => {
    // Add retry configuration for first-time requests
    const extendedConfig = config as ExtendedAxiosConfig
    if (!extendedConfig.retryConfig) {
      extendedConfig.retryConfig = {
        maxRetries: 3,
        baseDelay: 1000,
        onRetry: (attempt: number, error: any) => {
          console.log(`Retrying request (attempt ${attempt}):`, config.url)
        }
      }
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Enhanced error handling with retry logic
apiClient.interceptors.response.use(
  (response) => response,
  async (error: any) => {
    const config = error.config as ExtendedAxiosConfig
    
    // Don't retry on 4xx errors
    if (error.response?.status >= 400 && error.response?.status < 500) {
      return Promise.reject(error)
    }
    
    // Retry on network errors or 5xx
    if (!config._retry && config.retryConfig) {
      config._retry = true
      
      try {
        const response = await withRetry(
          () => apiClient.request(config as AxiosRequestConfig),
          config.retryConfig
        )
        return response
      } catch (retryError) {
        // Log error for debugging
        console.error('API Error after retries:', retryError)
      }
    }
    
    // Log error for debugging
    console.error('API Error:', error)
    
    // Return consistent error format
    if (error.response) {
      // Server responded with error status
      throw new Error(error.response.data?.message || `API Error: ${error.response.status}`)
    } else if (error.request) {
      // Request was made but no response received
      throw new Error('Network error: Unable to connect to server')
    } else {
      // Something else happened
      throw new Error(error.message || 'Unknown error occurred')
    }
  }
)

export default apiClient
