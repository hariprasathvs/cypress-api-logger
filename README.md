# Cypress API Logger

[![CI](https://github.com/hariprasathvs/cypress-api-logger/actions/workflows/ci.yml/badge.svg)](https://github.com/hariprasathvs/cypress-api-logger/actions/workflows/ci.yml)
[![npm version](https://img.shields.io/npm/v/cypress-api-logger.svg)](https://www.npmjs.com/package/cypress-api-logger)
[![npm downloads](https://img.shields.io/npm/dm/cypress-api-logger.svg)](https://www.npmjs.com/package/cypress-api-logger)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

`cypress-api-logger` is a Cypress plugin that logs detailed information about API requests and responses directly in the Cypress Test Runner. This tool helps you monitor and debug API interactions efficiently during your test execution.

## Preview

**What you'll see in the Cypress Test Runner:**

```
LOGGER        --- LOGGING STARTED FOR GET : https://api.example.com/users
              | Status: 200
              | Request Headers: { "Content-Type": "application/json" }
              | Response Body:
              |   [{ "id": 1, "name": "Alice" }, ...]
              | Duration: 142ms
```

> To add a screenshot or GIF: record your Cypress run, save the file under `docs/preview.gif`, and add `![preview](./docs/preview.gif)` above the code block.

## Features

- Logs HTTP request details: method, URL, headers, body, etc.
- Logs HTTP response details: status, headers, body, duration, etc.
- Easy integration into existing Cypress projects.
- Provides visibility into API interactions, helping to identify issues faster.
- GraphQL support: auto-detects and logs queries, variables, and responses.
- `cy.intercept` support: logs browser-level intercepted requests automatically.
- **Exclude URLs** from logging via substring or wildcard patterns.
- **Log only failures** — reduce noise in CI by logging only status ≥ 400.
- **Mask sensitive fields** — redact tokens, passwords, and API keys from logs.

## Installation

To install the `cypress-api-logger` plugin, run the following npm command:

```bash
npm install cypress-api-logger
```

## Usage
1. After installation, import the logger into your `e2e.js` (or `support/index.js`) file.
   `import 'cypress-api-logger';`
2. The plugin will automatically log API request and response details in the Cypress Test Runner.

## Example
After importing the plugin, simply use `cy.request()` in your tests. The plugin will log the relevant details automatically.

### Sample Test:

```javascript
describe('API Request Logging', () => {
  it('should log the request and response details', () => {
    cy.request('GET', 'https://jsonplaceholder.typicode.com/posts')
      .then((response) => {
        expect(response.status).to.eq(200);
      });
  });
});
```

### Output in Cypress Test Runner:
- Request Method: GET
- Request URL: https://jsonplaceholder.typicode.com/posts
- Response Status: 200
- Response Body: `<Response body content>`
- Duration: 123ms

## Configuration
Currently, the plugin logs all API requests and responses by default. Custom configurations, such as filtering or modifying the log details, can be added in future versions.

1. **Global Configuration:**  
You can set global configurations for the plugin using `Cypress.env('apiLoggerConfig', {...})`. These configurations will apply across all requests in the project.  

    **Default Configuration:**  
    - **`maxBodyLines`**: `50`  
  Controls the maximum number of lines displayed for the response body.  

    - **`displayFields`**:  
  `['method', 'url', 'status', 'requestBody', 'requestHeaders', 'responseBody', 'responseHeaders', 'duration', 'graphqlQuery']`  
  Specifies which fields should be displayed in the logs.  

    - **`enableApiLogging`**: `true`  
  Toggles API logging. When set to `false`, no logs will be displayed.  

    - **`enableGraphQLLogging`**: `true`  
  Toggles GraphQL API logging. When set to `false`, no logs will be displayed.  

        #### Example Usage:  

        To customize the configuration, add the following to your Cypress test or environment file:  

        ```javascript
        Cypress.env('apiLoggerConfig', {
          maxBodyLines: 100,
          displayFields: ['method', 'url', 'status'],
          enableApiLogging: false,
          enableGraphQLLogging: true,
        });
        ```

    - **`excludeUrls`**: `[]`  
  Array of URL patterns to skip logging. Supports exact substrings and `*` wildcards. Useful for ignoring health checks, analytics, or CDN requests.

        ```javascript
        Cypress.env('apiLoggerConfig', {
          excludeUrls: ['/health', '/analytics', '*.cdn.com*'],
        });
        ```

    - **`logOnlyFailures`**: `false`  
  When `true`, only requests with a response status `>= 400` are logged. Ideal for CI pipelines where you only care about what broke.

        ```javascript
        Cypress.env('apiLoggerConfig', {
          logOnlyFailures: true,
        });
        ```

    - **`maskFields`**: `[]`  
  Array of header and body field names to redact. Matching is case-insensitive. Matched values are replaced with `***MASKED***` in the log output — keeps tokens and passwords out of your test logs.

        ```javascript
        Cypress.env('apiLoggerConfig', {
          maskFields: ['authorization', 'x-api-key', 'password'],
        });
        ```

2. **Per-Request Configuration**:
   Users can also customize the logging behavior on a per-request basis by passing a `config` object inside the `cy.request()` options.

## cy.intercept Support

`cypress-api-logger` also automatically logs requests intercepted with `cy.intercept()` when you provide a route handler function.

```javascript
cy.intercept('GET', '/api/users', (req) => {
  req.continue((res) => {
    // your assertions here
    expect(res.statusCode).to.eq(200);
  });
}).as('getUsers');
```

The logger will output the same structured log (method, URL, status, headers, body, duration) for intercepted requests — no extra setup required.

> **Note:** Logging only activates when a handler function is provided. Static stubs (`cy.intercept('/api', { body: {} })`) are passed through unchanged.

## Contributing
Feel free to contribute to this project! Fork the repository, create a new branch, and submit a pull request with your improvements.

1. Fork the repository
2. Create your feature branch (git checkout -b feature-name)
3. Commit your changes (git commit -m 'Add new feature')
4. Push to the branch (git push origin feature-name)
5. Create a new pull request

## Bugs or Issues?
If you encounter any bugs or have suggestions, please open an issue in the GitHub repository.

## About
Author: Hari Prasath VS

GitHub Repository: https://github.com/hariprasathvs/cypress-api-logger

## License
This project is licensed under the MIT License .
