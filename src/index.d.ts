/// <reference types="cypress" />

/**
 * Configuration options for cypress-api-logger.
 * Set via `Cypress.env('apiLoggerConfig', config)` globally,
 * or pass per-request via the `config` field in `cy.request()` options.
 */
export interface ApiLoggerConfig {
  /**
   * Toggle all API logging on or off.
   * @default true
   */
  enableApiLogging?: boolean;

  /**
   * Toggle GraphQL-specific logging on or off.
   * @default true
   */
  enableGraphQLLogging?: boolean;

  /**
   * Maximum number of lines to display from the response body.
   * @default 50
   */
  maxBodyLines?: number;

  /**
   * Fields to include in the log output.
   * @default ['method','url','status','requestBody','requestHeaders','responseBody','responseHeaders','duration','graphqlQuery']
   */
  displayFields?: Array<
    | 'method'
    | 'url'
    | 'status'
    | 'requestBody'
    | 'requestHeaders'
    | 'responseBody'
    | 'responseHeaders'
    | 'duration'
    | 'graphqlQuery'
  >;

  /**
   * GraphQL-specific fields to include in the log output.
   * @default ['query', 'variables', 'responseBody']
   */
  graphQLFields?: Array<'query' | 'variables' | 'responseBody'>;

  /**
   * URL patterns to exclude from logging. Supports exact substrings and
   * wildcards (`*`). Matched requests are silently skipped.
   * @example ['/health', '/analytics', '*.cdn.com']
   * @default []
   */
  excludeUrls?: string[];

  /**
   * When true, only requests with a response status >= 400 are logged.
   * Useful in CI to reduce noise and focus on failures.
   * @default false
   */
  logOnlyFailures?: boolean;

  /**
   * Header and body field names to redact. Matching is case-insensitive.
   * Matched values are replaced with `'***MASKED***'` in the log output.
   * @example ['authorization', 'x-api-key', 'password']
   * @default []
   */
  maskFields?: string[];

  /**
   * URL allowlist. When set, only requests whose URL matches at least one
   * pattern are logged — everything else is silently skipped.
   * Supports exact substrings and `*` wildcards.
   * @example ['/api/payments', '/api/orders']
   * @default []
   */
  includeUrls?: string[];

  /**
   * Duration threshold in milliseconds. Requests that exceed this value are
   * flagged with a `⚠ SLOW` indicator in the Cypress log and `displayName`.
   * Set to `null` to disable (default).
   * @example 1000
   * @default null
   */
  slowThreshold?: number | null;

  /**
   * Custom callback fired after every logged request. Receives the full
   * (masked) log data — use it to pipe logs to Slack, Datadog, a file, or
   * any external reporter.
   * @example (data) => { if (data.status >= 400) notifySlack(data); }
   * @default null
   */
  onLog?: (data: ApiLogData) => void;
}

/**
 * The data object passed to the `onLog` callback on every logged request.
 */
export interface ApiLogData {
  method: string;
  url: string;
  status: number;
  duration: number;
  requestBody: Record<string, unknown> | null;
  requestHeaders: Record<string, unknown>;
  responseBody: Record<string, unknown> | unknown[] | null;
  responseHeaders: Record<string, unknown> | null;
  isGraphQL: boolean;
  isSlow: boolean;
}

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Overwritten by cypress-api-logger to automatically log
       * request and response details in the Cypress Test Runner.
       */
      request(url: string): Chainable<Response<unknown>>;
      request(url: string, body: RequestBody): Chainable<Response<unknown>>;
      request(method: string, url: string): Chainable<Response<unknown>>;
      request(method: string, url: string, body: RequestBody): Chainable<Response<unknown>>;
      request<T = unknown>(options: Partial<RequestOptions> & { config?: ApiLoggerConfig }): Chainable<Response<T>>;
    }
  }
}

export {};
