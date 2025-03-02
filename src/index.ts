// Types for requests and responses
export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD" | "OPTIONS";

export interface RequestConfig<D = any> {
  baseURL?: string;
  url?: string;
  method?: HttpMethod;
  headers?: Record<string, string>;
  params?: Record<string, string | number | boolean | null | undefined>;
  body?: D;
  timeout?: number;
  responseType?: "json" | "text" | "blob" | "arraybuffer";
  signal?: AbortSignal;
  onUploadProgress?: (progressEvent: { loaded: number; total: number }) => void;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  config: RequestConfig;
}

export interface HttpError<T = any> extends Error {
  config: RequestConfig;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  data?: T;
}

// Interceptor interfaces
interface Interceptor<V> {
  onFulfilled?: (value: V) => V | Promise<V>;
  onRejected?: (error: any) => any;
}

// Core HTTP client implementation
export class HttpClient {
  public defaults: RequestConfig = {
    baseURL: "",
    headers: {
      "Content-Type": "application/json",
    },
    method: "GET",
    timeout: 0,
    responseType: "json",
  };

  private requestInterceptors: Interceptor<RequestConfig>[] = [];
  private responseInterceptors: Interceptor<HttpResponse>[] = [];

  constructor(config: RequestConfig = {}) {
    this.defaults = { ...this.defaults, ...config };
  }

  // Interceptor methods
  public interceptors = {
    request: {
      use: (onFulfilled?: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>, onRejected?: (error: any) => any): number => {
        const interceptor: Interceptor<RequestConfig> = { onFulfilled, onRejected };
        this.requestInterceptors.push(interceptor);
        return this.requestInterceptors.length - 1;
      },
      eject: (id: number): void => {
        if (id >= 0 && id < this.requestInterceptors.length) {
          this.requestInterceptors.splice(id, 1);
        }
      },
    },
    response: {
      use: (onFulfilled?: (response: HttpResponse) => HttpResponse | Promise<HttpResponse>, onRejected?: (error: any) => any): number => {
        const interceptor: Interceptor<HttpResponse> = { onFulfilled, onRejected };
        this.responseInterceptors.push(interceptor);
        return this.responseInterceptors.length - 1;
      },
      eject: (id: number): void => {
        if (id >= 0 && id < this.responseInterceptors.length) {
          this.responseInterceptors.splice(id, 1);
        }
      },
    },
  };

  // Configure instance with new defaults
  public create(config: RequestConfig): HttpClient {
    return new HttpClient({ ...this.defaults, ...config });
  }

  // Main request method
  public async request<T = any, D = any>(config: RequestConfig<D>): Promise<HttpResponse<T>> {
    try {
      // Process request with interceptors
      let requestConfig = this.mergeConfig(config);
      requestConfig = await this.runRequestInterceptors(requestConfig);

      // Execute the request
      const response = await this.executeRequest<T>(requestConfig);

      // Process response with interceptors
      return this.runResponseInterceptors(response);
    } catch (error) {
      return this.handleError(error, config);
    }
  }

  // Convenience methods
  public async get<T = any>(url: string, config: Omit<RequestConfig, "url" | "method"> = {}): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "GET" });
  }

  public async post<T = any, D = any>(url: string, data?: D, config: Omit<RequestConfig, "url" | "method" | "body"> = {}): Promise<HttpResponse<T>> {
    return this.request<T, D>({ ...config, url, method: "POST", body: data });
  }

  public async put<T = any, D = any>(url: string, data?: D, config: Omit<RequestConfig, "url" | "method" | "body"> = {}): Promise<HttpResponse<T>> {
    return this.request<T, D>({ ...config, url, method: "PUT", body: data });
  }

  public async patch<T = any, D = any>(url: string, data?: D, config: Omit<RequestConfig, "url" | "method" | "body"> = {}): Promise<HttpResponse<T>> {
    return this.request<T, D>({ ...config, url, method: "PATCH", body: data });
  }

  public async delete<T = any>(url: string, config: Omit<RequestConfig, "url" | "method"> = {}): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "DELETE" });
  }

  public async head<T = any>(url: string, config: Omit<RequestConfig, "url" | "method"> = {}): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "HEAD" });
  }

  public async options<T = any>(url: string, config: Omit<RequestConfig, "url" | "method"> = {}): Promise<HttpResponse<T>> {
    return this.request<T>({ ...config, url, method: "OPTIONS" });
  }

  // Private helper methods
  private mergeConfig(config: RequestConfig): RequestConfig {
    return {
      ...this.defaults,
      ...config,
      headers: {
        ...this.defaults.headers,
        ...(config.headers || {}),
      },
    };
  }

  private async runRequestInterceptors(config: RequestConfig): Promise<RequestConfig> {
    let currentConfig = { ...config };

    for (const interceptor of this.requestInterceptors) {
      if (interceptor.onFulfilled) {
        try {
          currentConfig = await interceptor.onFulfilled(currentConfig);
        } catch (error) {
          if (interceptor.onRejected) {
            currentConfig = await interceptor.onRejected(error);
          } else {
            throw error;
          }
        }
      }
    }

    return currentConfig;
  }

  private async runResponseInterceptors(response: HttpResponse): Promise<HttpResponse> {
    let currentResponse = { ...response };

    for (const interceptor of this.responseInterceptors) {
      if (interceptor.onFulfilled) {
        try {
          currentResponse = await interceptor.onFulfilled(currentResponse);
        } catch (error) {
          if (interceptor.onRejected) {
            currentResponse = await interceptor.onRejected(error);
          } else {
            throw error;
          }
        }
      }
    }

    return currentResponse;
  }

  private async executeRequest<T>(config: RequestConfig): Promise<HttpResponse<T>> {
    const { baseURL, url, timeout, params, responseType, onUploadProgress, ...fetchOptions } = config;

    // Build URL with query parameters
    const fullURL = new URL(`${baseURL || ""}${url || ""}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          fullURL.searchParams.append(key, String(value));
        }
      });
    }

    // Set up timeout if specified
    let timeoutId: number | undefined;
    const controller = fetchOptions.signal ? null : new AbortController();
    const signal = fetchOptions.signal || controller?.signal;

    if (timeout && timeout > 0 && controller) {
      timeoutId = window.setTimeout(() => controller.abort(), timeout);
    }

    try {
      // Prepare request body
      let requestBody = fetchOptions.body;
      const contentType = (fetchOptions.headers && fetchOptions.headers["Content-Type"]) || "";

      if (requestBody && typeof requestBody === "object" && contentType.includes("application/json")) {
        requestBody = JSON.stringify(requestBody);
      }

      // Execute fetch
      const response = await fetch(fullURL.toString(), {
        ...fetchOptions,
        body: requestBody as BodyInit,
        signal,
      });

      // Process response based on type
      const data = await this.parseResponse<T>(response, responseType);

      // Create response object
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers,
        config,
      };
    } finally {
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId);
      }
    }
  }

  private async parseResponse<T>(response: Response, responseType: string = "json"): Promise<T> {
    if (!response.ok) {
      const error = new Error(`Request failed with status ${response.status}`) as HttpError;
      error.status = response.status;
      error.statusText = response.statusText;

      // Convert Headers to plain object
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });
      error.headers = headers;

      try {
        error.data = await this.getResponseData(response, responseType);
      } catch {
        // Ignore parsing errors for error responses
      }
      if (response.status === 204) {
        return null as T;
      }
      throw error;
    }

    return this.getResponseData(response, responseType);
  }

  private async getResponseData<T>(response: Response, responseType: string = "json"): Promise<T> {
    if (response.status === 204) {
      return (responseType === "json" ? {} : null) as unknown as T;
    }

    switch (responseType) {
      case "json":
        return response.json();
      case "text":
        return response.text() as unknown as T;
      case "blob":
        return response.blob() as unknown as T;
      case "arraybuffer":
        return response.arrayBuffer() as unknown as T;
      default:
        return response.json();
    }
  }

  private async handleError(error: any, config: RequestConfig): Promise<never> {
    if (error.name === "AbortError") {
      const timeoutError = new Error(`Request timeout of ${config.timeout}ms exceeded`) as HttpError;
      timeoutError.config = config;
      throw timeoutError;
    }

    // If it's already an HttpError, just rethrow
    if (error.config) {
      throw error;
    }

    // Otherwise, create a proper HttpError
    const httpError = error as HttpError;
    httpError.config = config;
    throw httpError;
  }
}

// Create default instance
const kopru = new HttpClient();

// Export both the class and default instance
export { kopru as default };
