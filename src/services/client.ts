import { createHash } from "node:crypto";
import type { WorksectionApiResponse } from "../types.js";

/**
 * Worksection API client that handles authentication and request execution.
 * Supports admin token auth (MD5 hash) with 1 req/sec rate limiting.
 */
export class WorksectionClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private lastRequestTime = 0;

  constructor(accountUrl: string, apiKey: string) {
    // Normalize: remove trailing slash
    this.baseUrl = accountUrl.replace(/\/+$/, "");
    this.apiKey = apiKey;
  }

  /**
   * Build the MD5 hash token for admin API auth.
   * Hash = md5(queryParams + apiKey)
   */
  private buildHash(queryParams: string): string {
    return createHash("md5").update(queryParams + this.apiKey).digest("hex");
  }

  /**
   * Enforce 1 request per second rate limit.
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const elapsed = now - this.lastRequestTime;
    if (elapsed < 1100) {
      await new Promise((resolve) => setTimeout(resolve, 1100 - elapsed));
    }
    this.lastRequestTime = Date.now();
  }

  /**
   * Build query string from action + params (excluding hash).
   */
  private buildQueryString(
    action: string,
    params: Record<string, string | undefined>
  ): string {
    const parts: string[] = [`action=${action}`];
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== "") {
        parts.push(`${key}=${value}`);
      }
    }
    return parts.join("&");
  }

  /**
   * Execute a GET request against the Worksection admin API.
   */
  async get<T>(
    action: string,
    params: Record<string, string | undefined> = {}
  ): Promise<WorksectionApiResponse<T>> {
    await this.rateLimit();

    const queryString = this.buildQueryString(action, params);
    const hash = this.buildHash(queryString);
    const url = `${this.baseUrl}/api/admin/${
      "v2"
    }/?${queryString}&hash=${hash}`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new WorksectionApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data = (await response.json()) as WorksectionApiResponse<T>;

    if (data.status === "error") {
      throw new WorksectionApiError(
        `Worksection API error: ${JSON.stringify(data.data)}`,
        400
      );
    }

    return data;
  }

  /**
   * Execute a POST request against the Worksection admin API.
   */
  async post<T>(
    action: string,
    params: Record<string, string | undefined> = {},
    bodyParams: Record<string, string | undefined> = {}
  ): Promise<WorksectionApiResponse<T>> {
    await this.rateLimit();

    // All params go in query string for hash calculation
    const allParams = { ...params, ...bodyParams };
    const queryString = this.buildQueryString(action, allParams);
    const hash = this.buildHash(queryString);

    // For POST, send params as form data
    const urlQueryString = this.buildQueryString(action, params);
    const url = `${this.baseUrl}/api/admin/v2/?${urlQueryString}&hash=${hash}`;

    const formData = new URLSearchParams();
    for (const [key, value] of Object.entries(bodyParams)) {
      if (value !== undefined && value !== "") {
        formData.append(key, value);
      }
    }

    const response = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new WorksectionApiError(
        `HTTP ${response.status}: ${response.statusText}`,
        response.status
      );
    }

    const data = (await response.json()) as WorksectionApiResponse<T>;

    if (data.status === "error") {
      throw new WorksectionApiError(
        `Worksection API error: ${JSON.stringify(data.data)}`,
        400
      );
    }

    return data;
  }
}

export class WorksectionApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "WorksectionApiError";
  }
}

/**
 * Create a singleton client from environment variables.
 */
export function createClientFromEnv(): WorksectionClient {
  const accountUrl = process.env.WORKSECTION_URL;
  const apiKey = process.env.WORKSECTION_API_KEY;

  if (!accountUrl) {
    throw new Error(
      "Missing WORKSECTION_URL environment variable. " +
        "Set it to your Worksection account URL, e.g. https://myaccount.worksection.com"
    );
  }

  if (!apiKey) {
    throw new Error(
      "Missing WORKSECTION_API_KEY environment variable. " +
        "Find your admin API key at: Account → API → Show API key"
    );
  }

  return new WorksectionClient(accountUrl, apiKey);
}
