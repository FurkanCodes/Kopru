**DISCLAIMER**
This is a work in progress project.

# kopru Documentation

Kopru is a modern HTTP client for JavaScript/TypeScript applications that provides a clean, promise-based API for making HTTP requests. It's designed to be feature-rich while maintaining a simple interface, similar to popular libraries like Axios.

## Installation

```bash
npm install neo-fetch
# or
yarn add neo-fetch
```

## Basic Usage

```typescript
import kopru from "kopru";

// Simple GET request
kopru
  .get("https://api.example.com/data")
  .then((response) => {
    console.log(response.data);
  })
  .catch((error) => {
    console.error("Error:", error);
  });

// Using async/await
async function fetchData() {
  try {
    const response = await kopru.get("https://api.example.com/data");
    console.log(response.data);
  } catch (error) {
    console.error("Error:", error);
  }
}
```

## Key Features

### HTTP Methods

kopru supports all standard HTTP methods:

```typescript
// GET request
kopru.get("/users");

// POST request with data
kopru.post("/users", { name: "John", email: "john@example.com" });

// PUT request
kopru.put("/users/1", { name: "John Updated" });

// PATCH request
kopru.patch("/users/1", { name: "John Patched" });

// DELETE request
kopru.delete("/users/1");

// HEAD request
kopru.head("/users");

// OPTIONS request
kopru.options("/users");
```

### Request Configuration

You can customize requests with a configuration object:

```typescript
kopru.get("/users", {
  baseURL: "https://api.example.com",
  headers: {
    Authorization: "Bearer token123",
    Accept: "application/json",
  },
  params: {
    page: 1,
    limit: 10,
    filter: "active",
  },
  timeout: 5000, // 5 seconds
  responseType: "json", // 'json', 'text', 'blob', or 'arraybuffer'
});
```

### Creating Custom Instances

Create instances with custom default configurations:

```typescript
const api = kopru.create({
  baseURL: "https://api.example.com",
  headers: {
    Authorization: "Bearer token123",
    "Content-Type": "application/json",
  },
  timeout: 10000,
});

// Now use this custom instance
api.get("/users");
```

### Interceptors

Interceptors allow you to intercept requests or responses before they are handled:

```typescript
// Request interceptor
const requestInterceptor = kopru.interceptors.request.use(
  (config) => {
    // Modify config before request is sent
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${getToken()}`,
    };
    return config;
  },
  (error) => {
    // Handle request errors
    return Promise.reject(error);
  }
);

// Response interceptor
const responseInterceptor = kopru.interceptors.response.use(
  (response) => {
    // Any status code within the range of 2xx
    return response;
  },
  (error) => {
    // Any status codes outside the range of 2xx
    if (error.status === 401) {
      // Handle unauthorized error
      refreshToken();
    }
    return Promise.reject(error);
  }
);

// Remove interceptors if needed
kopru.interceptors.request.eject(requestInterceptor);
kopru.interceptors.response.eject(responseInterceptor);
```

### Handling Responses

Responses are structured with useful information:

```typescript
kopru.get("/users/1").then((response) => {
  console.log(response.data); // Response body
  console.log(response.status); // HTTP status code
  console.log(response.statusText); // HTTP status message
  console.log(response.headers); // Response headers
  console.log(response.config); // Request configuration
});
```

### Error Handling

Errors provide detailed information about what went wrong:

```typescript
kopru.get("/users/999").catch((error) => {
  if (error.status) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    console.log(error.status);
    console.log(error.statusText);
    console.log(error.data);
    console.log(error.headers);
  } else if (error.message.includes("timeout")) {
    // The request timed out
    console.log("Request timed out");
  } else {
    // Something happened in setting up the request
    console.log("Error:", error.message);
  }
  console.log(error.config); // Request configuration
});
```

### Timeout Handling

Set timeouts to abort requests that take too long:

```typescript
// Set a 5-second timeout
kopru.get("/users", { timeout: 5000 }).catch((error) => {
  if (error.message.includes("timeout")) {
    console.log("Request timed out after 5 seconds");
  }
});
```

### Abort Requests

Cancel requests using AbortController:

```typescript
const controller = new AbortController();

kopru.get("/users", { signal: controller.signal }).catch((error) => {
  if (error.name === "AbortError") {
    console.log("Request was cancelled");
  }
});

// Cancel the request
controller.abort();
```

### Different Response Types

Handle various response formats:

```typescript
// Get JSON (default)
kopru.get("/data", { responseType: "json" });

// Get text
kopru.get("/data.txt", { responseType: "text" });

// Get binary data
kopru.get("/image.png", { responseType: "blob" });

// Get ArrayBuffer
kopru.get("/data.bin", { responseType: "arraybuffer" });
```

## Advanced Example

```typescript
// Create a custom instance
const api = kopru.create({
  baseURL: "https://api.example.com/v1",
  timeout: 8000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Add request interceptor to add auth token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = {
      ...config.headers,
      Authorization: `Bearer ${token}`,
    };
  }
  return config;
});

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // Handle token refresh on 401 errors
    if (error.status === 401 && !error.config._retry) {
      error.config._retry = true;
      try {
        const refreshToken = localStorage.getItem("refreshToken");
        const response = await api.post("/auth/refresh", { token: refreshToken });
        const newToken = response.data.token;
        localStorage.setItem("token", newToken);

        // Retry the original request with new token
        error.config.headers["Authorization"] = `Bearer ${newToken}`;
        return api.request(error.config);
      } catch (refreshError) {
        // Refresh token failed, redirect to login
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Export for use throughout the application
export default api;
```
