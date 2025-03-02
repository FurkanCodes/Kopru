# neofetch Documentation

## Table of Contents

1. [Introduction](#introduction)
2. [Installation](#installation)
3. [Basic Usage](#basic-usage)
4. [API Reference](#api-reference)
    - [Main Client](#main-client)
    - [Request Configuration](#request-configuration)
    - [Response Format](#response-format)
    - [Error Handling](#error-handling)
    - [Interceptors](#interceptors)
5. [Advanced Usage](#advanced-usage)
    - [Creating Instances](#creating-instances)
    - [TypeScript Integration](#typescript-integration)
    - [Request Cancellation](#request-cancellation)
    - [Progress Tracking](#progress-tracking)
6. [Examples](#examples)
7. [Migration Guide](#migration-guide)
8. [Contributing](#contributing)
9. [License](#license)

## Introduction

neofetch is a type-safe, promise-based HTTP client for the browser and Node.js. It provides a clean, familiar interface similar to Axios while leveraging the modern Fetch API under the hood.

**Key Features:**

- Full TypeScript support with generics for request/response data
- Request and response interceptors
- Automatic transforms for JSON data
- Client-side protection against XSRF
- Request cancellation
- Automatic request timeouts
- Clean error handling
- Instance creation with custom defaults
- SOLID principles and clean architecture

## Installation

```bash
# Using npm
npm install fetch-pro

# Using yarn
yarn add fetch-pro

# Using pnpm
pnpm add fetch-pro
```

## Basic Usage

### Making Requests

```typescript
import neofetch from 'fetch-pro';

// GET request
neofetch.get('/users')
  .then(response => {
    console.log(response.data);
  })
  .catch(error => {
    console.error('Error:', error);
  });

// POST request
neofetch.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
})
  .then(response => {
    console.log(response.data);
  });

// Async/await
async function getUser(id) {
  try {
    const response = await neofetch.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
}
```

### Request Methods

neofetch supports all standard HTTP methods:

```typescript
// GET request
neofetch.get(url[, config])

// POST request
neofetch.post(url[, data[, config]])

// PUT request
neofetch.put(url[, data[, config]])

// PATCH request
neofetch.patch(url[, data[, config]])

// DELETE request
neofetch.delete(url[, config])

// HEAD request
neofetch.head(url[, config])

// OPTIONS request
neofetch.options(url[, config])
```

## API Reference

### Main Client

#### `neofetch.request(config)`

```typescript
neofetch.request<T = any, D = any>(config: RequestConfig<D>): Promise<HttpResponse<T>>
```

Make an HTTP request based on the provided configuration object.

#### `neofetch.get(url[, config])`

```typescript
neofetch.get<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<HttpResponse<T>>
```

Make a GET request to the specified URL.

#### `neofetch.post(url[, data[, config]])`

```typescript
neofetch.post<T = any, D = any>(url: string, data?: D, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<HttpResponse<T>>
```

Make a POST request to the specified URL with optional data.

#### `neofetch.put(url[, data[, config]])`

```typescript
neofetch.put<T = any, D = any>(url: string, data?: D, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<HttpResponse<T>>
```

Make a PUT request to the specified URL with optional data.

#### `neofetch.patch(url[, data[, config]])`

```typescript
neofetch.patch<T = any, D = any>(url: string, data?: D, config?: Omit<RequestConfig, 'url' | 'method' | 'body'>): Promise<HttpResponse<T>>
```

Make a PATCH request to the specified URL with optional data.

#### `neofetch.delete(url[, config])`

```typescript
neofetch.delete<T = any>(url: string, config?: Omit<RequestConfig, 'url' | 'method'>): Promise<HttpResponse<T>>
```

Make a DELETE request to the specified URL.

### Request Configuration

The `RequestConfig` interface defines the configuration options for making requests:

```typescript
interface RequestConfig<D = any> {
  baseURL?: string;           // Base URL to be prepended to 'url'
  url?: string;               // URL for the request
  method?: HttpMethod;        // HTTP method
  headers?: Record<string, string>; // Request headers
  params?: Record<string, string | number | boolean | null | undefined>; // URL parameters
  body?: D;                   // Request body
  timeout?: number;           // Request timeout in ms
  responseType?: 'json' | 'text' | 'blob' | 'arraybuffer'; // Expected response type
  signal?: AbortSignal;       // AbortSignal for request cancellation
}
```

### Response Format

The `HttpResponse` interface defines the structure of the response object:

```typescript
interface HttpResponse<T = any> {
  data: T;                    // Response payload
  status: number;             // HTTP status code
  statusText: string;         // HTTP status message
  headers: Record<string, string>; // Response headers
  config: RequestConfig;      // Request configuration
}
```

### Error Handling

When a request fails, neofetch throws an `HttpError` that contains information about the request and response:

```typescript
interface HttpError<T = any> extends Error {
  config: RequestConfig;      // Original request configuration
  status?: number;            // HTTP status code (if available)
  statusText?: string;        // HTTP status message (if available)
  headers?: Record<string, string>; // Response headers (if available)
  data?: T;                   // Response data (if available)
}
```

Example error handling:

```typescript
neofetch.get('/users/1')
  .then(response => {
    console.log('User:', response.data);
  })
  .catch(error => {
    if (error.status === 404) {
      console.log('User not found');
    } else if (error.message.includes('timeout')) {
      console.log('Request timed out');
    } else {
      console.error('Error making request:', error.message);
    }
    
    // Access error response data if available
    if (error.data) {
      console.error('Server error details:', error.data);
    }
  });
```

### Interceptors

Interceptors allow you to intercept requests or responses before they are handled by `then` or `catch`.

#### Request Interceptors

```typescript
// Add a request interceptor
const interceptorId = neofetch.interceptors.request.use(
  // OnFulfilled handler
  config => {
    // Modify request config before sending
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${getToken()}`
    };
    return config;
  },
  // OnRejected handler (optional)
  error => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Remove the interceptor later if needed
neofetch.interceptors.request.eject(interceptorId);
```

#### Response Interceptors

```typescript
// Add a response interceptor
const interceptorId = neofetch.interceptors.response.use(
  // OnFulfilled handler
  response => {
    // Transform successful response
    if (response.data && response.data.results) {
      response.data = response.data.results;
    }
    return response;
  },
  // OnRejected handler (optional)
  error => {
    // Handle response error globally
    if (error.status === 401) {
      // Redirect to login or refresh token
      refreshToken();
    }
    return Promise.reject(error);
  }
);

// Remove the interceptor later if needed
neofetch.interceptors.response.eject(interceptorId);
```

## Advanced Usage

### Creating Instances

You can create a customized instance of neofetch with specific default settings:

```typescript
import { HttpClient } from 'fetch-pro';

const apiClient = new HttpClient({
  baseURL: 'https://api.example.com/v1',
  timeout: 10000,
  headers: {
    'X-API-Key': 'your-api-key',
    'Accept': 'application/json'
  }
});

// Use the new instance
apiClient.get('/users')
  .then(response => {
    console.log(response.data);
  });
```

### TypeScript Integration

neofetch leverages TypeScript's generics to provide type safety for your API calls:

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

interface CreateUserRequest {
  name: string;
  email: string;
  password: string;
}

// GET with response type
const getUser = async (id: number): Promise<User> => {
  const response = await neofetch.get<User>(`/users/${id}`);
  return response.data; // Typed as User
};

// POST with request and response types
const createUser = async (userData: CreateUserRequest): Promise<User> => {
  const response = await neofetch.post<User, CreateUserRequest>('/users', userData);
  return response.data; // Typed as User
};
```

### Request Cancellation

You can cancel requests using the AbortController API:

```typescript
// Create an abort controller
const controller = new AbortController();

// Pass the signal to the request
neofetch.get('/users', {
  signal: controller.signal
})
  .then(response => {
    console.log('Response:', response.data);
  })
  .catch(error => {
    if (error.name === 'AbortError') {
      console.log('Request was canceled');
    } else {
      console.error('Error:', error);
    }
  });

// Cancel the request
controller.abort();
```

### Progress Tracking

For large file uploads, you can track progress using the Fetch API's ReadableStream:

```typescript
const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const controller = new AbortController();
  
  try {
    const response = await neofetch.post('/upload', formData, {
      headers: {
        // Don't set Content-Type for FormData, browser will add boundary
        'Content-Type': undefined,
      },
      signal: controller.signal,
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        console.log(`Upload progress: ${percentCompleted}%`);
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};
```

## Examples

### Authentication

```typescript
// Setup authentication interceptor
neofetch.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers = {
      ...config.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return config;
});

// Handle expired tokens
neofetch.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;
    
    // If the error is 401 and we haven't retried yet
    if (error.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh the token
        const refreshToken = localStorage.getItem('refreshToken');
        const response = await neofetch.post('/auth/refresh', { refreshToken });
        
        // Store the new token
        const { token } = response.data;
        localStorage.setItem('token', token);
        
        // Update the auth header
        originalRequest.headers['Authorization'] = `Bearer ${token}`;
        
        // Retry the original request
        return neofetch.request(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.clear();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);
```

### API Service

```typescript
// users.service.ts
import neofetch from 'fetch-pro';

interface User {
  id: number;
  name: string;
  email: string;
}

interface UserCreateDto {
  name: string;
  email: string;
  password: string;
}

interface UserUpdateDto {
  name?: string;
  email?: string;
}

export class UserService {
  private baseUrl = '/api/users';
  
  async getAll(): Promise<User[]> {
    const response = await neofetch.get<User[]>(this.baseUrl);
    return response.data;
  }
  
  async getById(id: number): Promise<User> {
    const response = await neofetch.get<User>(`${this.baseUrl}/${id}`);
    return response.data;
  }
  
  async create(user: UserCreateDto): Promise<User> {
    const response = await neofetch.post<User, UserCreateDto>(this.baseUrl, user);
    return response.data;
  }
  
  async update(id: number, updates: UserUpdateDto): Promise<User> {
    const response = await neofetch.patch<User, UserUpdateDto>(`${this.baseUrl}/${id}`, updates);
    return response.data;
  }
  
  async delete(id: number): Promise<void> {
    await neofetch.delete(`${this.baseUrl}/${id}`);
  }
}

// Usage
const userService = new UserService();

// Get all users
userService.getAll()
  .then(users => console.log('Users:', users))
  .catch(error => console.error('Error:', error));
```

## Migration Guide

### Migrating from Axios

If you're migrating from Axios to neofetch, here are the key differences:

| Feature | Axios | neofetch |
|---------|-------|----------|
| Default Import | `import axios from 'axios'` | `import neofetch from 'fetch-pro'` |
| Request Body | `data` property | `body` property |
| Response Format | Similar | Similar, with `data`, `status`, etc. |
| Config | Similar overall | Similar overall |
| Interceptors | Similar | Similar API |
| Defaults | `axios.defaults` | `neofetch.defaults` |
| Instance Creation | `axios.create()` | `new HttpClient()` |
| Request Cancellation | CancelToken (deprecated) or AbortController | AbortController |
| Progress | `onUploadProgress` / `onDownloadProgress` | `onUploadProgress` / `onDownloadProgress` |

### Migration Example

```typescript
// Axios code
import axios from 'axios';

axios.defaults.baseURL = 'https://api.example.com';
axios.defaults.headers.common['Authorization'] = 'Bearer token';

axios.get('/users')
  .then(response => console.log(response.data));

// neofetch equivalent
import neofetch from 'fetch-pro';

neofetch.defaults.baseURL = 'https://api.example.com';
neofetch.defaults.headers['Authorization'] = 'Bearer token';

neofetch.get('/users')
  .then(response => console.log(response.data));
```

## Contributing

We welcome contributions to neofetch! Please read our contributing guidelines before submitting pull requests.

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

neofetch is MIT licensed. See the [LICENSE](LICENSE) file for details.

---

For any questions or issues, please open an issue on GitHub or contact our support team.

© 2025 neofetch Team
