'use strict';

/**
 * Unit tests for logRequestDetails — targets 100% statement + branch coverage.
 *
 * Branch map (every || / && / ternary in the function):
 *   B01  Cypress.env('apiLoggerConfig') || {}  — env returns object vs null
 *   B02  !enableApiLogging                     — true (early return) / false
 *   B03  requestDetails.method || 'GET'        — has method / no method
 *   B04  typeof requestDetails === 'string'    — string / object
 *   B05  requestDetails.body || null           — has body / no body
 *   B06  requestDetails.headers || {}          — has headers / no headers
 *   B07  response.body ? … : 'No Response Body'— truthy / falsy
 *   B08  url.includes('/graphql') || …         — url match (short-circuit)
 *   B09  … || (requestBody && typeof …query === 'string') — body.query match
 *   B10  requestBody (in B09 inner &&)         — falsy (short-circuit)
 *   B11  isGraphQL && requestBody?.query ?     — true+query / true+no-query / false
 *   B12  isGraphQL && requestBody?.variables ? — true+vars / true+no-vars / false
 *   B13  isGraphQL && !enableGraphQLLogging    — early return / continue
 *   B14  displayFields.includes('status')      — true / false
 *   B15  displayFields.includes('requestHeaders') — true / false
 *   B16  displayFields.includes('requestBody') && requestBody — both combos
 *   B17  isGraphQL && enableGraphQLLogging     — true / false
 *   B18  displayFields.includes('graphqlQuery')— true / false
 *   B19  graphQLFields.includes('query') && query — both combos
 *   B20  graphQLFields.includes('variables') && variables — both combos
 *   B21  displayFields.includes('responseHeaders') && response.headers — both combos
 *   B22  displayFields.includes('responseBody') && response.body — both combos
 *   B23  displayFields.includes('duration') && duration — both combos
 *   B24  isGraphQL ? 'GraphQL Log' : 'Custom Log' — both sides
 */

let logRequestDetails;

const buildCypressMock = (envConfig = null) => ({
    env: jest.fn().mockReturnValue(envConfig),
    log: jest.fn(),
    Commands: { overwrite: jest.fn() },
});

beforeEach(() => {
    jest.resetModules();
    global.Cypress = buildCypressMock();
    ({ logRequestDetails } = require('../src/logger'));
});

afterEach(() => {
    jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const REST_RESPONSE = { status: 200, body: { id: 1 }, headers: { 'content-type': 'application/json' } };
const REST_REQUEST  = { method: 'GET', url: '/api/users', body: null, headers: { Accept: '*/*' } };

function getLogArg() {
    return Cypress.log.mock.calls[0][0];
}

// ---------------------------------------------------------------------------
// B01 — Cypress.env('apiLoggerConfig') || {}
// ---------------------------------------------------------------------------

describe('B01 — Cypress.env config fallback', () => {
    it('uses {} when Cypress.env returns null', () => {
        global.Cypress.env.mockReturnValue(null);
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(Cypress.log).toHaveBeenCalled();
    });

    it('uses the returned config object when Cypress.env returns a value', () => {
        global.Cypress.env.mockReturnValue({ maxBodyLines: 10 });
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(Cypress.log).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// B02 — !enableApiLogging
// ---------------------------------------------------------------------------

describe('B02 — enableApiLogging flag', () => {
    it('returns early without logging when enableApiLogging is false (global config)', () => {
        global.Cypress.env.mockReturnValue({ enableApiLogging: false });
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(Cypress.log).not.toHaveBeenCalled();
    });

    it('returns early without logging when enableApiLogging is false (per-request config)', () => {
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100, { enableApiLogging: false });
        expect(Cypress.log).not.toHaveBeenCalled();
    });

    it('proceeds with logging when enableApiLogging is true (default)', () => {
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(Cypress.log).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// B03 — requestDetails.method || 'GET'
// ---------------------------------------------------------------------------

describe('B03 — method fallback', () => {
    it("defaults to 'GET' when method is missing", () => {
        logRequestDetails({ url: '/api/items' }, REST_RESPONSE, 100);
        expect(getLogArg().message).toContain('GET : /api/items');
    });

    it('uses the provided method', () => {
        logRequestDetails({ method: 'DELETE', url: '/api/items/1' }, REST_RESPONSE, 100);
        expect(getLogArg().message).toContain('DELETE : /api/items/1');
    });
});

// ---------------------------------------------------------------------------
// B04 — typeof requestDetails === 'string'
// ---------------------------------------------------------------------------

describe('B04 — requestDetails as string vs object', () => {
    it('treats a string requestDetails as the URL', () => {
        logRequestDetails('https://api.example.com/posts', REST_RESPONSE, 100);
        const msg = getLogArg().message;
        expect(msg).toContain('GET : https://api.example.com/posts');
    });

    it('reads url from requestDetails.url when it is an object', () => {
        logRequestDetails({ method: 'POST', url: '/api/posts', body: null }, REST_RESPONSE, 100);
        expect(getLogArg().message).toContain('POST : /api/posts');
    });
});

// ---------------------------------------------------------------------------
// B05 — requestDetails.body || null  &  B16 — displayFields + requestBody
// ---------------------------------------------------------------------------

describe('B05 / B16 — requestBody present or absent', () => {
    it('includes Request Body in log when body is present', () => {
        const req = { method: 'POST', url: '/api', body: { name: 'Alice' }, headers: {} };
        logRequestDetails(req, REST_RESPONSE, 100);
        expect(getLogArg().message).toContain('Request Body');
    });

    it('omits Request Body from log when body is null', () => {
        logRequestDetails({ method: 'GET', url: '/api', body: null }, REST_RESPONSE, 100);
        expect(getLogArg().message).not.toContain('Request Body');
    });
});

// ---------------------------------------------------------------------------
// B06 — requestDetails.headers || {}
// ---------------------------------------------------------------------------

describe('B06 — requestHeaders fallback', () => {
    it('uses {} when headers are not provided', () => {
        logRequestDetails({ method: 'GET', url: '/api' }, REST_RESPONSE, 100);
        const consoleProps = getLogArg().consoleProps();
        expect(consoleProps['Request Headers']).toEqual({});
    });

    it('uses provided headers', () => {
        const req = { method: 'GET', url: '/api', headers: { Authorization: 'Bearer tok' } };
        logRequestDetails(req, REST_RESPONSE, 100);
        const consoleProps = getLogArg().consoleProps();
        expect(consoleProps['Request Headers']).toEqual({ Authorization: 'Bearer tok' });
    });
});

// ---------------------------------------------------------------------------
// B07 — response.body truthy / falsy  &  B22 — displayFields responseBody
// ---------------------------------------------------------------------------

describe('B07 / B22 — response body present or absent', () => {
    it('shows "No Response Body" in consoleProps when response.body is null', () => {
        logRequestDetails(REST_REQUEST, { status: 204, body: null, headers: {} }, 100);
        const consoleProps = getLogArg().consoleProps();
        expect(consoleProps['Response Body']).toBe('No Response Body');
    });

    it('includes Response Body in the log message when response.body is truthy', () => {
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(getLogArg().message).toContain('Response Body');
    });

    it('omits Response Body from log message when response.body is null', () => {
        logRequestDetails(REST_REQUEST, { status: 204, body: null, headers: {} }, 100);
        expect(getLogArg().message).not.toContain('Response Body');
    });
});

// ---------------------------------------------------------------------------
// maxBodyLines truncation
// ---------------------------------------------------------------------------

describe('maxBodyLines — response body truncation', () => {
    it('truncates response body to the configured maxBodyLines', () => {
        global.Cypress.env.mockReturnValue({ maxBodyLines: 3 });
        const body = { a: 1, b: 2, c: 3, d: 4, e: 5 };
        logRequestDetails(REST_REQUEST, { status: 200, body, headers: {} }, 100);
        const msg = getLogArg().message;
        const expected = JSON.stringify(body, null, 2).split('\n').slice(0, 3).join('\n');
        expect(msg).toContain(expected);
    });
});

// ---------------------------------------------------------------------------
// B08 / B09 / B10 — isGraphQL detection (4 code paths in the || chain)
// ---------------------------------------------------------------------------

describe('B08-B10 — isGraphQL detection', () => {
    it('detects GraphQL when URL contains /graphql (short-circuits right side)', () => {
        // B08: left side of || is true
        logRequestDetails(
            { method: 'POST', url: '/graphql', body: { query: '{ users { id } }' } },
            { status: 200, body: { data: {} }, headers: {} },
            100,
        );
        expect(getLogArg().displayName).toBe('GRAPHQL LOGGER');
    });

    it('detects GraphQL via requestBody.query being a string when URL has no /graphql', () => {
        // B09: right side of || is true (requestBody.query is a string)
        logRequestDetails(
            { method: 'POST', url: '/api/query', body: { query: '{ posts { id } }' } },
            { status: 200, body: { data: {} }, headers: {} },
            100,
        );
        expect(getLogArg().displayName).toBe('GRAPHQL LOGGER');
    });

    it('is NOT GraphQL when URL has no /graphql and requestBody is null (B10: requestBody falsy)', () => {
        // B10: inner && short-circuits because requestBody is null
        logRequestDetails(
            { method: 'GET', url: '/api/users', body: null },
            REST_RESPONSE,
            100,
        );
        expect(getLogArg().displayName).toBe('LOGGER');
    });

    it('is NOT GraphQL when requestBody.query is not a string', () => {
        // B09: right side of || — requestBody.query is a number, not a string
        logRequestDetails(
            { method: 'POST', url: '/api/data', body: { query: 42 } },
            REST_RESPONSE,
            100,
        );
        expect(getLogArg().displayName).toBe('LOGGER');
    });
});

// ---------------------------------------------------------------------------
// B11 — query extraction  &  B12 — variables extraction
// ---------------------------------------------------------------------------

describe('B11 / B12 — query and variables extraction', () => {
    it('extracts query and variables when both are present (B11 true, B12 true)', () => {
        logRequestDetails(
            { method: 'POST', url: '/graphql', body: { query: '{ users { id } }', variables: { limit: 5 } } },
            { status: 200, body: { data: {} }, headers: {} },
            100,
        );
        const props = getLogArg().consoleProps();
        expect(props['GraphQL Query']).toBe('{ users { id } }');
        expect(props['GraphQL Variables']).toEqual({ limit: 5 });
    });

    it('sets query and variables to undefined when GraphQL is detected via URL but body is null (B11 false via null body, B12 false via null body)', () => {
        logRequestDetails(
            { method: 'GET', url: '/graphql', body: null },
            { status: 200, body: null, headers: {} },
            100,
        );
        const props = getLogArg().consoleProps();
        expect(props['GraphQL Query']).toBeUndefined();
        expect(props['GraphQL Variables']).toBeUndefined();
    });

    it('sets variables to undefined when GraphQL body has query but no variables (B12 false via missing field)', () => {
        logRequestDetails(
            { method: 'POST', url: '/graphql', body: { query: '{ users { id } }' } },
            { status: 200, body: { data: {} }, headers: {} },
            100,
        );
        const props = getLogArg().consoleProps();
        expect(props['GraphQL Query']).toBe('{ users { id } }');
        expect(props['GraphQL Variables']).toBeUndefined();
    });

    it('sets query and variables to undefined when request is not GraphQL (B11 false, B12 false)', () => {
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        const props = getLogArg().consoleProps();
        expect(props['GraphQL Query']).toBeUndefined();
        expect(props['GraphQL Variables']).toBeUndefined();
    });
});

// ---------------------------------------------------------------------------
// B13 — isGraphQL && !enableGraphQLLogging (early return)
// ---------------------------------------------------------------------------

describe('B13 — GraphQL logging disabled flag', () => {
    it('skips logging and logs to console when GraphQL request but enableGraphQLLogging is false', () => {
        jest.spyOn(console, 'log').mockImplementation(() => {});
        global.Cypress.env.mockReturnValue({ enableGraphQLLogging: false });

        logRequestDetails(
            { method: 'POST', url: '/graphql', body: { query: '{ users { id } }' } },
            { status: 200, body: {}, headers: {} },
            100,
        );

        expect(Cypress.log).not.toHaveBeenCalled();
        expect(console.log).toHaveBeenCalledWith(
            'GraphQL logging is disabled. Skipping logging for this request.',
        );
    });

    it('continues logging when isGraphQL is false (condition is false)', () => {
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(Cypress.log).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// B14 — displayFields.includes('status')
// ---------------------------------------------------------------------------

describe('B14 — status field', () => {
    it('includes Status in log when "status" is in displayFields', () => {
        global.Cypress.env.mockReturnValue({ displayFields: ['status'] });
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(getLogArg().message).toContain('Status');
    });

    it('omits Status from log when "status" is not in displayFields', () => {
        global.Cypress.env.mockReturnValue({ displayFields: [] });
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(getLogArg().message).not.toContain('Status');
    });
});

// ---------------------------------------------------------------------------
// B15 — displayFields.includes('requestHeaders')
// ---------------------------------------------------------------------------

describe('B15 — requestHeaders field', () => {
    it('includes Request Headers when "requestHeaders" is in displayFields', () => {
        global.Cypress.env.mockReturnValue({ displayFields: ['requestHeaders'] });
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(getLogArg().message).toContain('Request Headers');
    });

    it('omits Request Headers when "requestHeaders" is not in displayFields', () => {
        global.Cypress.env.mockReturnValue({ displayFields: [] });
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(getLogArg().message).not.toContain('Request Headers');
    });
});

// ---------------------------------------------------------------------------
// B17 — isGraphQL && enableGraphQLLogging  +  B18/B19/B20 nested GraphQL fields
// ---------------------------------------------------------------------------

describe('B17-B20 — GraphQL logging block', () => {
    it('enters GraphQL block and logs query+variables when all conditions are met (B17-B20 true paths)', () => {
        logRequestDetails(
            { method: 'POST', url: '/graphql', body: { query: '{ users { id } }', variables: { limit: 10 } } },
            { status: 200, body: { data: {} }, headers: {} },
            100,
        );
        const msg = getLogArg().message;
        expect(msg).toContain('GraphQL Query');
        expect(msg).toContain('GraphQL Variables');
    });

    it('skips GraphQL block entirely when isGraphQL is false (B17 false)', () => {
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(getLogArg().message).not.toContain('GraphQL Query');
    });

    it('skips query+variables when "graphqlQuery" is not in displayFields (B18 false)', () => {
        global.Cypress.env.mockReturnValue({ displayFields: ['status'] });
        logRequestDetails(
            { method: 'POST', url: '/graphql', body: { query: '{ users { id } }', variables: { limit: 10 } } },
            { status: 200, body: { data: {} }, headers: {} },
            100,
        );
        expect(getLogArg().message).not.toContain('GraphQL Query');
        expect(getLogArg().message).not.toContain('GraphQL Variables');
    });

    it('skips query line when "query" is not in graphQLFields (B19 false via field list)', () => {
        global.Cypress.env.mockReturnValue({ graphQLFields: ['variables', 'responseBody'] });
        logRequestDetails(
            { method: 'POST', url: '/graphql', body: { query: '{ users { id } }', variables: { limit: 10 } } },
            { status: 200, body: { data: {} }, headers: {} },
            100,
        );
        expect(getLogArg().message).not.toContain('GraphQL Query');
        expect(getLogArg().message).toContain('GraphQL Variables');
    });

    it('skips query line when query is undefined even though "query" is in graphQLFields (B19 false via undefined query)', () => {
        // isGraphQL via URL but body is null → query=undefined
        logRequestDetails(
            { method: 'GET', url: '/graphql', body: null },
            { status: 200, body: null, headers: {} },
            100,
        );
        expect(getLogArg().message).not.toContain('GraphQL Query');
    });

    it('skips variables line when "variables" is not in graphQLFields (B20 false via field list)', () => {
        global.Cypress.env.mockReturnValue({ graphQLFields: ['query'] });
        logRequestDetails(
            { method: 'POST', url: '/graphql', body: { query: '{ users { id } }', variables: { limit: 10 } } },
            { status: 200, body: { data: {} }, headers: {} },
            100,
        );
        expect(getLogArg().message).not.toContain('GraphQL Variables');
    });

    it('skips variables line when variables is undefined even though "variables" is in graphQLFields (B20 false via undefined variables)', () => {
        logRequestDetails(
            { method: 'POST', url: '/graphql', body: { query: '{ users { id } }' } },
            { status: 200, body: { data: {} }, headers: {} },
            100,
        );
        expect(getLogArg().message).not.toContain('GraphQL Variables');
    });
});

// ---------------------------------------------------------------------------
// B21 — displayFields.includes('responseHeaders') && response.headers
// ---------------------------------------------------------------------------

describe('B21 — responseHeaders field', () => {
    it('includes Response Headers when field is in displayFields and headers are present', () => {
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(getLogArg().message).toContain('Response Headers');
    });

    it('omits Response Headers when "responseHeaders" is not in displayFields', () => {
        global.Cypress.env.mockReturnValue({ displayFields: [] });
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(getLogArg().message).not.toContain('Response Headers');
    });

    it('omits Response Headers when response.headers is null', () => {
        logRequestDetails(REST_REQUEST, { status: 200, body: { id: 1 }, headers: null }, 100);
        expect(getLogArg().message).not.toContain('Response Headers');
    });
});

// ---------------------------------------------------------------------------
// B23 — displayFields.includes('duration') && duration
// ---------------------------------------------------------------------------

describe('B23 — duration field', () => {
    it('includes Duration when field is in displayFields and duration is truthy', () => {
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 150);
        expect(getLogArg().message).toContain('Duration');
    });

    it('omits Duration when "duration" is not in displayFields', () => {
        global.Cypress.env.mockReturnValue({ displayFields: [] });
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 150);
        expect(getLogArg().message).not.toContain('Duration');
    });

    it('omits Duration when duration is 0 (falsy)', () => {
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 0);
        expect(getLogArg().message).not.toContain('Duration');
    });
});

// ---------------------------------------------------------------------------
// B24 — isGraphQL ternary in Cypress.log (name / displayName)
// ---------------------------------------------------------------------------

describe('B24 — Cypress.log name and displayName', () => {
    it('sets name="Custom Log" and displayName="LOGGER" for REST requests', () => {
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        const arg = getLogArg();
        expect(arg.name).toBe('Custom Log');
        expect(arg.displayName).toBe('LOGGER');
    });

    it('sets name="GraphQL Log" and displayName="GRAPHQL LOGGER" for GraphQL requests', () => {
        logRequestDetails(
            { method: 'POST', url: '/graphql', body: { query: '{ users { id } }' } },
            { status: 200, body: { data: {} }, headers: {} },
            100,
        );
        const arg = getLogArg();
        expect(arg.name).toBe('GraphQL Log');
        expect(arg.displayName).toBe('GRAPHQL LOGGER');
    });
});

// ---------------------------------------------------------------------------
// consoleProps — full object shape
// ---------------------------------------------------------------------------

describe('consoleProps — all fields populated correctly', () => {
    it('returns all consoleProps fields for a REST request', () => {
        const req  = { method: 'PUT', url: '/api/users/1', body: { name: 'Bob' }, headers: { Authorization: 'Bearer x' } };
        const resp = { status: 200, body: { id: 1 }, headers: { 'content-type': 'application/json' } };
        logRequestDetails(req, resp, 75);

        const props = getLogArg().consoleProps();
        expect(props['Request Method']).toBe('PUT');
        expect(props['Request URL']).toBe('/api/users/1');
        expect(props['Request Body']).toEqual({ name: 'Bob' });
        expect(props['Request Headers']).toEqual({ Authorization: 'Bearer x' });
        expect(props['GraphQL Query']).toBeUndefined();
        expect(props['GraphQL Variables']).toBeUndefined();
        expect(props['Response Status']).toBe(200);
        expect(props['Response Body']).toContain('"id": 1');
        expect(props['Duration (ms)']).toBe(75);
    });

    it('returns all consoleProps fields for a GraphQL request', () => {
        const req  = { method: 'POST', url: '/graphql', body: { query: '{ users { id } }', variables: { id: 1 } } };
        const resp = { status: 200, body: { data: { users: [] } }, headers: { 'content-type': 'application/json' } };
        logRequestDetails(req, resp, 200);

        const props = getLogArg().consoleProps();
        expect(props['GraphQL Query']).toBe('{ users { id } }');
        expect(props['GraphQL Variables']).toEqual({ id: 1 });
    });
});

// ---------------------------------------------------------------------------
// per-request config override (merged on top of global config)
// ---------------------------------------------------------------------------

describe('per-request config override', () => {
    it('per-request config takes precedence over global config', () => {
        global.Cypress.env.mockReturnValue({ enableApiLogging: true, displayFields: ['status', 'duration'] });
        // per-request overrides displayFields to empty
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100, { displayFields: [] });
        expect(getLogArg().message).not.toContain('Status');
    });
});
