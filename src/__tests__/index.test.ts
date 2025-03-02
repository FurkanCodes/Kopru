import kopru, { HttpClient } from "../index";

// Mock the global fetch function
global.fetch = jest.fn();

describe("HttpClient", () => {
  beforeEach(() => {
    (global.fetch as jest.Mock).mockClear();
  });

  it("should be defined", () => {
    expect(kopru).toBeDefined();
    expect(kopru instanceof HttpClient).toBeTruthy();
  });

  it("should create a new instance with custom config", () => {
    const client = new HttpClient({
      baseURL: "https://api.example.com",
      headers: {
        "X-API-Key": "test-key",
      },
    });

    expect(client.defaults.baseURL).toBe("https://api.example.com");
    expect(client.defaults.headers?.["X-API-Key"]).toBe("test-key");
  });
});
