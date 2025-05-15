import { HttpResponse, HttpError, ServerActionResult } from './interfaces';



/**
 * Converts an HttpResponse or HttpError to a ServerActionResult
 * @param responseOrError The HTTP response or error to convert
 * @returns A standardized ServerActionResult
 */
export function createServerActionResult<T = any, D = any>(
  responseOrError: HttpResponse<T> | HttpError<D>
): ServerActionResult<T, D> {
  // Check if it's an Error object (HttpError)
  if (responseOrError instanceof Error) {
    const error = responseOrError as HttpError<D>;
    return {
      error: {
        message: error.message || "Request failed",
        status: error.status,
        details: error.data as D
      }
    };
  }
  
  // If not an error, it must be a response
  const response = responseOrError as HttpResponse<T>;
  return { 
    data: response.data,
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  };
}

/**
 * Executes a server action and returns a standardized result
 * @param actionFn The function that performs the HTTP request
 * @returns A standardized ServerActionResult with either data or error information
 */
export async function executeServerAction<T = any, D = any>(
  actionFn: () => Promise<HttpResponse<T>>
): Promise<ServerActionResult<T, D>> {
  try {
    const response = await actionFn();
    return { 
      data: response.data,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers
    };
  } catch (error) {
    if (error instanceof Error) {
      const httpError = error as HttpError<D>;
      return {
        error: {
          message: httpError.message || "Request failed",
          status: httpError.status,
          details: httpError.data as D
        }
      };
    }
    return { 
      error: { 
        message: "An unknown error occurred", 
        details: {} as D 
      } 
    };
  }
}