import { describe, it, expect, vi } from "vitest";
import worker from "../src/index.js";

describe("phish-hook Worker", () => {
  const createMockEnv = (runMock = vi.fn()) => ({
    AI: {
      run: runMock,
    },
    ASSETS: {
      fetch: vi.fn(async () => new Response('<!doctype html><div id="root"></div>', {
        headers: { 'Content-Type': 'text/html;charset=UTF-8' },
      })),
    },
  });

  describe("CORS preflight", () => {
    it("handles OPTIONS requests with CORS headers", async () => {
      const request = new Request("http://localhost/analyze", {
        method: "OPTIONS",
      });
      const env = createMockEnv();
      const response = await worker.fetch(request, env, {});

      expect(response.status).toBe(200);
      expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
      expect(response.headers.get("Access-Control-Allow-Methods")).toContain("POST");
    });
  });

  describe("GET /", () => {
    it("serves the interactive site", async () => {
      const request = new Request("http://localhost/", {
        method: "GET",
      });
      const env = createMockEnv();
      const response = await worker.fetch(request, env, {});

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toContain("text/html");
      expect(await response.text()).toContain('id="root"');
      expect(env.ASSETS.fetch).toHaveBeenCalledWith(request);
    });
  });

  describe("GET /api/docs", () => {
    it("returns API documentation and endpoints info", async () => {
      const request = new Request("http://localhost/api/docs", {
        method: "GET",
      });
      const env = createMockEnv();
      const response = await worker.fetch(request, env, {});

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/json");
      const body = await response.json();
      expect(body.name).toBe("phish-hook");
      expect(body.endpoints).toBeDefined();
      expect(body.endpoints["POST /analyze"]).toBeDefined();
    });
  });

  describe("POST /analyze", () => {
    it("returns 400 when content is missing", async () => {
      const request = new Request("http://localhost/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const env = createMockEnv();
      const response = await worker.fetch(request, env, {});

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Missing required 'content' field");
    });

    it("successfully analyzes phishing content with Workers AI", async () => {
      const mockAiResponse = {
        response: "Risk: CRITICAL. This email is an impersonation attempt.",
      };
      const runMock = vi.fn().mockResolvedValue(mockAiResponse);
      const env = createMockEnv(runMock);

      const payload = {
        content: "Urgent: update your password immediately by clicking this link.",
        sender: "security@paypa1-security.com",
        subject: "Account Notice",
      };

      const request = new Request("http://localhost/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const response = await worker.fetch(request, env, {});

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.analysis).toBe(mockAiResponse.response);

      expect(runMock).toHaveBeenCalledTimes(1);
      const [model, options] = runMock.mock.calls[0];
      expect(model).toBe("@cf/meta/llama-3.1-8b-instruct");
      expect(options.messages[1].content).toContain(payload.content);
      expect(options.messages[1].content).toContain(payload.sender);
    });

    it("returns 500 when Workers AI fails", async () => {
      const runMock = vi.fn().mockRejectedValue(new Error("AI service unavailable"));
      const env = createMockEnv(runMock);

      const request = new Request("http://localhost/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: "Sample email text" }),
      });

      const response = await worker.fetch(request, env, {});

      expect(response.status).toBe(500);
      const data = await response.json();
      expect(data.success).toBe(false);
      expect(data.error).toBe("AI service unavailable");
    });
  });

  describe("POST /chat", () => {
    it("returns 400 when prompt is missing", async () => {
      const request = new Request("http://localhost/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const env = createMockEnv();
      const response = await worker.fetch(request, env, {});

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.error).toContain("Missing 'prompt'");
    });

    it("successfully completes prompt with Workers AI", async () => {
      const mockAiResponse = { response: "Hello! How can I help you?" };
      const runMock = vi.fn().mockResolvedValue(mockAiResponse);
      const env = createMockEnv(runMock);

      const request = new Request("http://localhost/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: "Hello" }),
      });

      const response = await worker.fetch(request, env, {});

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.response).toBe(mockAiResponse.response);
      expect(runMock).toHaveBeenCalledWith("@cf/meta/llama-3.1-8b-instruct", {
        prompt: "Hello",
      });
    });
  });

  describe("404 Route Handling", () => {
    it("returns 404 for unknown endpoints", async () => {
      const request = new Request("http://localhost/non-existent-route", {
        method: "GET",
      });
      const env = createMockEnv();
      const response = await worker.fetch(request, env, {});

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.error).toBe("Not Found");
    });
  });
});
