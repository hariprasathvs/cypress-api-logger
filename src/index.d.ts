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
