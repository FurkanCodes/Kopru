import kopru, { HttpClient } from "../index";

describe("HttpClient", () => {
  // Mock fetch before each test
  beforeEach(() => {
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ data: "test" }),
        headers: new Headers(),
        status: 200,
        statusText: "OK",
      })
    );
  });

  // Clear mocks after each test
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should create a new kopru instance", () => {
    const client = kopru.create({ baseURL: "https://api.example.com" });
    expect(client).toBeInstanceOf(HttpClient);
  });

  it("should send a GET request with correct parameters", async () => {
    // Create a client with a base URL
    const client = kopru.create({
      baseURL: "https://api.example.com",
    });

    // Perform GET request
    const response = await client.get("/users", {
      params: {
        id: 123,
        active: true,
      },
      headers: {
        Authorization: "Bearer test-token",
      },
    });

    // Verify fetch was called with correct URL and options
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.example.com/users?id=123&active=true",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          "Content-Type": "application/json",
          Authorization: "Bearer test-token",
        }),
      })
    );

    // Verify response structure
    expect(response).toEqual(
      expect.objectContaining({
        data: { data: "test" },
        status: 200,
        statusText: "OK",
        headers: expect.any(Object),
        config: expect.any(Object),
      })
    );
  });

  it("should handle network errors", async () => {
    // Mock a network error
    global.fetch = jest.fn().mockImplementation(() => Promise.reject(new Error("Network error")));

    const client = kopru.create({
      baseURL: "https://api.example.com",
    });

    // Expect the request to throw an error
    await expect(client.get("/test")).rejects.toThrow("Network error");
  });

  it("should handle HTTP error responses", async () => {
    // Mock a 404 error response
    global.fetch = jest.fn().mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 404,
        statusText: "Not Found",
        json: () => Promise.resolve({ message: "Resource not found" }),
        headers: new Headers(),
      })
    );

    const client = kopru.create({
      baseURL: "https://api.example.com",
    });

    // Expect the request to throw an HttpError
    await expect(client.get("/nonexistent")).rejects.toMatchObject({
      status: 404,
      statusText: "Not Found",
    });
  });

  it("should send a POST request with correct parameters", async () => {
    const client = kopru.create({
      baseURL: "https://api.example.com",
    });

    const data = { name: "John Doe", email: "test@gmail.com" };
    const response = await client.post("/users", data);
    expect(response).toEqual(expect.any(Object)); // Ensure data is an object
  });
});
