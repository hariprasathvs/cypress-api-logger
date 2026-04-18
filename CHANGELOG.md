# Changelog

All notable changes to `cypress-api-logger` are documented here.

---

## [1.3.3] - 2026-04-18

### Added
- **`includeUrls`** config option — URL allowlist, the complement to `excludeUrls`. When set, only requests matching at least one pattern are logged. Supports substrings and `*` wildcards.
- **`slowThreshold`** config option — flags requests that exceed the configured duration (ms) with a `⚠ SLOW` indicator in the Cypress log `displayName` and log message body.
- **`onLog`** config option — custom callback fired after every logged request with the full (masked) log data object (`method`, `url`, `status`, `duration`, `requestBody`, `requestHeaders`, `responseBody`, `responseHeaders`, `isGraphQL`, `isSlow`). Enables piping logs to Slack, Datadog, custom reporters, or files.

### Improved
- TypeScript definitions updated: new `ApiLogData` interface exported for use in `onLog` callback typing; new config options documented with JSDoc.
- Unit test suite expanded to 115 tests, maintaining 100% statement and branch coverage.

---

## [1.3.2] - 2026-04-18

### Added
- **`excludeUrls`** config option — skip logging for URLs matching a substring or `*` wildcard pattern (e.g. `['/health', '*.cdn.com*']`). Useful for filtering out health checks, analytics, and CDN noise.
- **`logOnlyFailures`** config option — when `true`, only requests with status `>= 400` are logged. Designed for CI pipelines where you only want to see what broke.
- **`maskFields`** config option — redact sensitive header and body fields (case-insensitive) by replacing their values with `***MASKED***`. Keeps tokens, passwords, and API keys out of test logs.

### Fixed
- Typo in README: `GrpahQL` → `GraphQL`.

### Improved
- TypeScript definitions updated with full JSDoc for all three new options.
- Unit test suite expanded to 98 tests, maintaining 100% statement and branch coverage.

---

## [1.3.1] - 2026-04-16

### Added
- `cy.intercept` support — automatically logs browser-level intercepted requests when a route handler function is provided.
- TypeScript definitions (`src/index.d.ts`) with full `ApiLoggerConfig` interface and augmented `Cypress.Chainable`.
- GitHub Actions CI workflow running Jest unit tests and Cypress E2E tests on every push/PR to `main`.
- npm badges (CI, version, downloads, license) in README.
- `CHANGELOG.md` covering all releases.
- `.npmignore` to exclude test files, coverage, and CI config from the published tarball (122 kB → 18 kB).

### Fixed
- `cy.intercept` wrappedHandler now wraps `req.continue` on the request object instead of calling it directly, preventing a double `req.continue` call that would throw once the request is already resolved.

### Improved
- npm keywords expanded from 1 to 10 for better discoverability.
- Unit test suite with 100% statement and branch coverage enforced via Jest coverage thresholds.

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
