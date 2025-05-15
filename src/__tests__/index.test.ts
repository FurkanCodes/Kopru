import { createServerActionResult, executeServerAction } from '../server-action';
import { HttpResponse, HttpError, ServerActionResult } from '../interfaces';
import kopru from "../index";

// Mock your HTTP client for testing
jest.mock("../index", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
  },
}));

describe('Server Action Utilities', () => {
  // Clear mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createServerActionResult', () => {
    it('should convert a successful HttpResponse to ServerActionResult', () => {
      // Arrange
      const mockResponse: HttpResponse<{ name: string }> = {
        data: { name: 'Test User' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config: { method: 'GET', url: '/test' }
      };

      // Act
      const result = createServerActionResult<{ name: string }>(mockResponse);

      // Assert
      expect(result).toEqual({
        data: { name: 'Test User' }
      });
      expect(result.error).toBeUndefined();
    });

    it('should convert an HttpError to ServerActionResult with error details', () => {
      // Arrange
      const mockError = new Error('Not Found') as HttpError<{ code: string }>;
      mockError.status = 404;
      mockError.statusText = 'Not Found';
      mockError.data = { code: 'RESOURCE_NOT_FOUND' };
      mockError.config = { method: 'GET', url: '/test' };

      // Act
      const result = createServerActionResult<any, { code: string }>(mockError);

      // Assert
      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        message: 'Not Found',
        status: 404,
        details: { code: 'RESOURCE_NOT_FOUND' }
      });
    });

    it('should handle HttpError without custom data', () => {
      // Arrange
      const mockError = new Error('Server Error') as HttpError;
      mockError.status = 500;
      mockError.statusText = 'Internal Server Error';
      mockError.config = { method: 'POST', url: '/test' };

      // Act
      const result = createServerActionResult(mockError);

      // Assert
      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        message: 'Server Error',
        status: 500,
        details: undefined
      });
    });
  });

  describe('executeServerAction', () => {
    it('should return data when the action succeeds', async () => {
      // Arrange
      const mockResponse: HttpResponse<{ id: number, name: string }> = {
        data: { id: 1, name: 'Test User' },
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        config: { method: 'GET', url: '/users/1' }
      };
      
      const mockAction = jest.fn().mockResolvedValue(mockResponse);

      // Act
      const result = await executeServerAction(mockAction);

      // Assert
      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({
        data: { id: 1, name: 'Test User' }
      });
      expect(result.error).toBeUndefined();
    });

    it('should return error details when the action fails with HttpError', async () => {
      // Arrange
      const mockError = new Error('Unauthorized') as HttpError<{ message: string }>;
      mockError.status = 401;
      mockError.statusText = 'Unauthorized';
      mockError.data = { message: 'Invalid token' };
      mockError.config = { method: 'GET', url: '/protected' };
      
      const mockAction = jest.fn().mockRejectedValue(mockError);

      // Act
      const result = await executeServerAction<any, { message: string }>(mockAction);

      // Assert
      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        message: 'Unauthorized',
        status: 401,
        details: { message: 'Invalid token' }
      });
    });

    it('should handle unknown errors gracefully', async () => {
      // Arrange
      const mockAction = jest.fn().mockRejectedValue('Unexpected error');

      // Act
      const result = await executeServerAction(mockAction);

      // Assert
      expect(mockAction).toHaveBeenCalledTimes(1);
      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        message: 'An unknown error occurred',
        details: {}
      });
    });
  });

  describe('Integration with kopru client', () => {
    it('should handle successful GET request through executeServerAction', async () => {
      // Arrange
      const mockResponse: HttpResponse = {
        data: { users: [{ id: 1, name: 'John' }] },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: { method: 'GET', url: '/users' }
      };
      
      (kopru.get as jest.Mock).mockResolvedValueOnce(mockResponse);

      // Act
      const result = await executeServerAction(() => kopru.get('/users'));

      // Assert
      expect(kopru.get).toHaveBeenCalledWith('/users');
      expect(result).toEqual({
        data: { users: [{ id: 1, name: 'John' }] }
      });
    });

    it('should handle failed POST request through executeServerAction', async () => {
      // Arrange
      const mockError = new Error('Validation failed') as HttpError;
      mockError.status = 422;
      mockError.data = { errors: [{ field: 'email', message: 'Invalid email' }] };
      mockError.config = { method: 'POST', url: '/users' };
      
      (kopru.post as jest.Mock).mockRejectedValueOnce(mockError);

      // Act
      const result = await executeServerAction(() => 
        kopru.post('/users', { name: 'Test', email: 'invalid' })
      );

      // Assert
      expect(kopru.post).toHaveBeenCalledWith('/users', { name: 'Test', email: 'invalid' });
      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        message: 'Validation failed',
        status: 422,
        details: { errors: [{ field: 'email', message: 'Invalid email' }] }
      });
    });
  });

  describe('Real-world use cases', () => {
    interface User {
      id: number;
      name: string;
      email: string;
    }
    
    interface ApiError {
      code: string;
      message: string;
      errors?: Array<{ field: string, message: string }>;
    }
    
    it('should handle a user creation scenario', async () => {
      // Arrange - success case
      const userData = { name: 'Alice', email: 'alice@example.com' };
      const mockResponse: HttpResponse<User> = {
        data: { id: 123, ...userData },
        status: 201,
        statusText: 'Created',
        headers: {},
        config: { method: 'POST', url: '/users' }
      };
      
      (kopru.post as jest.Mock).mockResolvedValueOnce(mockResponse);
      
      // Act - create user
      const createUser = () => executeServerAction<User, ApiError>(() => 
        kopru.post<User>('/users', userData)
      );
      
      const result = await createUser();
      
      // Assert
      expect(result.data).toEqual({ id: 123, name: 'Alice', email: 'alice@example.com' });
      expect(result.error).toBeUndefined();
    });
    
    it('should handle a user fetch with validation error', async () => {
      // Arrange - error case
      const mockError = new Error('Validation Error') as HttpError<ApiError>;
      mockError.status = 400;
      mockError.data = { 
        code: 'VALIDATION_ERROR',
        message: 'Invalid input',
        errors: [{ field: 'email', message: 'Email is required' }]
      };
      mockError.config = { method: 'POST', url: '/users' };
      
      (kopru.post as jest.Mock).mockRejectedValueOnce(mockError);
      
      // Act - create user with invalid data
      const createInvalidUser = () => executeServerAction<User, ApiError>(() => 
        kopru.post<User>('/users', { name: 'Bob' }) // Missing email
      );
      
      const result = await createInvalidUser();
      
      // Assert
      expect(result.data).toBeUndefined();
      expect(result.error).toEqual({
        message: 'Validation Error',
        status: 400,
        details: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input',
          errors: [{ field: 'email', message: 'Email is required' }]
        }
      });
    });
  });
});