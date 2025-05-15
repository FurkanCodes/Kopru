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
export interface Interceptor<V> {
  onFulfilled?: (value: V) => V | Promise<V>;
  onRejected?: (error: any) => any;
}


export interface ServerActionResult<T, D>{
    data?: T;
    error?: {
        message: string,
        status?: number,
        details: D
    }
}