# Changelog

All notable changes to `cypress-api-logger` are documented here.

---

## [1.3.0] - 2025-01-15

### Added
- **GraphQL support**: Automatically detects GraphQL requests (by URL or request body) and logs the query, variables, and response body separately.
- New `enableGraphQLLogging` config flag to toggle GraphQL-specific logging independently.
- New `graphQLFields` config option to control which GraphQL fields appear in the log (`query`, `variables`, `responseBody`).
- `graphqlQuery` added to the default `displayFields` list.

---

## [1.2.0] - 2024-12-04

### Added
- `enableApiLogging` flag — set to `false` to disable all API logging without removing the plugin from your support file.

### Improved
- Added fallback defaults for `maxBodyLines` and `displayFields` when no config is provided, preventing runtime errors in projects that haven't set `Cypress.env('apiLoggerConfig')`.

---

## [1.1.0] - 2024-12-03

### Added
- `displayFields` config option to selectively show/hide log fields (`method`, `url`, `status`, `requestBody`, `requestHeaders`, `responseBody`, `responseHeaders`, `duration`).
- `maxBodyLines` config option to cap the number of response body lines displayed (default: `50`).
- Support for both global config (`Cypress.env('apiLoggerConfig')`) and per-request config overrides.

---

## [1.0.1] - 2024-11-30

### Fixed
- README corrections and improved usage examples.

---

## [1.0.0] - 2024-11-30

### Added
- Initial release.
- Automatic logging of `cy.request()` calls — method, URL, status, request/response headers, request/response body, and duration.
- Logs appear directly in the Cypress Test Runner command log with expandable `consoleProps`.
