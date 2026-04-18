'use strict';

/**
 * Unit tests for 1.3.2 features — targets 100% statement + branch coverage.
 *
 * Branch map:
 *
 * maskSensitiveData
 *   M01  !obj                                      — null / truthy
 *   M02  typeof obj !== 'object'                   — primitive / object
 *   M03  maskFields.length === 0                   — empty / non-empty
 *   M04  Array.isArray(obj)                        — array / plain object
 *   M05  maskFields.some(...) per key              — match / no match
 *
 * isUrlExcluded
 *   U01  pattern.includes('*')                     — wildcard / substring
 *   U02  regex.test(url) for wildcard              — match / no match
 *   U03  url.includes(pattern) for substring       — match / no match
 *
 * logRequestDetails new branches
 *   L01  excludeUrls.length > 0 && isUrlExcluded  — empty list / excluded / not excluded
 *   L02  logOnlyFailures && status < 400           — false flag / success skip / failure log
 *   L03  masked values appear in log and consoleProps
 */

let maskSensitiveData;
let isUrlExcluded;
let logRequestDetails;

beforeEach(() => {
    jest.resetModules();
    global.Cypress = {
        env: jest.fn().mockReturnValue(null),
        log: jest.fn(),
        Commands: { overwrite: jest.fn() },
    };
    ({ maskSensitiveData, isUrlExcluded, logRequestDetails } = require('../src/logger'));
});

afterEach(() => {
    jest.restoreAllMocks();
});

const REST_REQUEST  = { method: 'GET', url: '/api/users', body: null, headers: { Accept: '*/*' } };
const REST_RESPONSE = { status: 200, body: { id: 1 }, headers: { 'content-type': 'application/json' } };

// ---------------------------------------------------------------------------
// maskSensitiveData
// ---------------------------------------------------------------------------

describe('maskSensitiveData', () => {
    describe('M01 — null / falsy obj', () => {
        it('returns null when obj is null', () => {
            expect(maskSensitiveData(null, ['authorization'])).toBeNull();
        });

        it('returns undefined when obj is undefined', () => {
            expect(maskSensitiveData(undefined, ['authorization'])).toBeUndefined();
        });
    });

    describe('M02 — primitive obj', () => {
        it('returns the value unchanged when obj is a string', () => {
            expect(maskSensitiveData('plain-string', ['authorization'])).toBe('plain-string');
        });

        it('returns the value unchanged when obj is a number', () => {
            expect(maskSensitiveData(42, ['authorization'])).toBe(42);
        });
    });

    describe('M03 — empty maskFields', () => {
        it('returns obj unchanged when maskFields is empty', () => {
            const obj = { authorization: 'Bearer token', name: 'Alice' };
            expect(maskSensitiveData(obj, [])).toBe(obj);
        });
    });

    describe('M04 — array obj', () => {
        it('returns array unchanged (field-name masking does not apply to arrays)', () => {
            const arr = [{ id: 1 }, { id: 2 }];
            expect(maskSensitiveData(arr, ['id'])).toBe(arr);
        });
    });

    describe('M05 — key matching', () => {
        it('masks a matching key (case-insensitive)', () => {
            const obj = { Authorization: 'Bearer secret', name: 'Alice' };
            const result = maskSensitiveData(obj, ['authorization']);
            expect(result.Authorization).toBe('***MASKED***');
            expect(result.name).toBe('Alice');
        });

        it('does not mask non-matching keys', () => {
            const obj = { 'x-request-id': 'abc123', name: 'Alice' };
            const result = maskSensitiveData(obj, ['authorization']);
            expect(result['x-request-id']).toBe('abc123');
            expect(result.name).toBe('Alice');
        });

        it('masks multiple fields in one pass', () => {
            const obj = { authorization: 'Bearer x', password: 'secret', name: 'Alice' };
            const result = maskSensitiveData(obj, ['authorization', 'password']);
            expect(result.authorization).toBe('***MASKED***');
            expect(result.password).toBe('***MASKED***');
            expect(result.name).toBe('Alice');
        });

        it('does not mutate the original object', () => {
            const obj = { authorization: 'Bearer x' };
            maskSensitiveData(obj, ['authorization']);
            expect(obj.authorization).toBe('Bearer x');
        });
    });
});

// ---------------------------------------------------------------------------
// isUrlExcluded
// ---------------------------------------------------------------------------

describe('isUrlExcluded', () => {
    describe('U01 / U02 — wildcard patterns', () => {
        it('returns true when wildcard pattern matches the URL', () => {
            expect(isUrlExcluded('https://assets.cdn.com/logo.png', ['*.cdn.com*'])).toBe(true);
        });

        it('returns false when wildcard pattern does not match the URL', () => {
            expect(isUrlExcluded('https://api.example.com/users', ['*.cdn.com*'])).toBe(false);
        });
    });

    describe('U01 / U03 — substring patterns', () => {
        it('returns true when substring pattern is found in the URL', () => {
            expect(isUrlExcluded('/api/health', ['/health'])).toBe(true);
        });

        it('returns false when substring pattern is not in the URL', () => {
            expect(isUrlExcluded('/api/users', ['/health'])).toBe(false);
        });
    });

    it('returns false for an empty excludeUrls list', () => {
        expect(isUrlExcluded('/api/users', [])).toBe(false);
    });

    it('returns true when any one of multiple patterns matches', () => {
        expect(isUrlExcluded('/api/analytics', ['/health', '/analytics'])).toBe(true);
    });
});

// ---------------------------------------------------------------------------
// logRequestDetails — L01: excludeUrls
// ---------------------------------------------------------------------------

describe('L01 — excludeUrls filtering', () => {
    it('logs normally when excludeUrls is empty (default)', () => {
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(Cypress.log).toHaveBeenCalled();
    });

    it('skips logging when URL matches an excludeUrls pattern', () => {
        global.Cypress.env.mockReturnValue({ excludeUrls: ['/api/users'] });
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(Cypress.log).not.toHaveBeenCalled();
    });

    it('logs normally when URL does not match any excludeUrls pattern', () => {
        global.Cypress.env.mockReturnValue({ excludeUrls: ['/health', '/analytics'] });
        logRequestDetails(REST_REQUEST, REST_RESPONSE, 100);
        expect(Cypress.log).toHaveBeenCalled();
    });

    it('skips logging when URL matches a wildcard excludeUrls pattern', () => {
        global.Cypress.env.mockReturnValue({ excludeUrls: ['*.cdn.com*'] });
        logRequestDetails(
            { method: 'GET', url: 'https://assets.cdn.com/logo.png' },
            REST_RESPONSE,
            100,
        );
        expect(Cypress.log).not.toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// logRequestDetails — L02: logOnlyFailures
// ---------------------------------------------------------------------------

describe('L02 — logOnlyFailures flag', () => {
    it('logs all requests when logOnlyFailures is false (default)', () => {
        logRequestDetails(REST_REQUEST, { ...REST_RESPONSE, status: 200 }, 100);
        expect(Cypress.log).toHaveBeenCalled();
    });

    it('skips successful requests (status < 400) when logOnlyFailures is true', () => {
        global.Cypress.env.mockReturnValue({ logOnlyFailures: true });
        logRequestDetails(REST_REQUEST, { ...REST_RESPONSE, status: 200 }, 100);
        expect(Cypress.log).not.toHaveBeenCalled();
    });

    it('logs failed requests (status >= 400) when logOnlyFailures is true', () => {
        global.Cypress.env.mockReturnValue({ logOnlyFailures: true });
        logRequestDetails(REST_REQUEST, { ...REST_RESPONSE, status: 404 }, 100);
        expect(Cypress.log).toHaveBeenCalled();
    });

    it('logs server errors (status 500) when logOnlyFailures is true', () => {
        global.Cypress.env.mockReturnValue({ logOnlyFailures: true });
        logRequestDetails(REST_REQUEST, { ...REST_RESPONSE, status: 500 }, 100);
        expect(Cypress.log).toHaveBeenCalled();
    });
});

// ---------------------------------------------------------------------------
// logRequestDetails — L03: maskFields applied to log output
// ---------------------------------------------------------------------------

describe('L03 — maskFields redaction', () => {
    it('masks sensitive request headers in log message', () => {
        global.Cypress.env.mockReturnValue({ maskFields: ['authorization'] });
        const req = { method: 'GET', url: '/api/users', headers: { Authorization: 'Bearer secret' } };
        logRequestDetails(req, REST_RESPONSE, 100);
        const msg = Cypress.log.mock.calls[0][0].message;
        expect(msg).toContain('***MASKED***');
        expect(msg).not.toContain('Bearer secret');
    });

    it('masks sensitive request headers in consoleProps', () => {
        global.Cypress.env.mockReturnValue({ maskFields: ['authorization'] });
        const req = { method: 'GET', url: '/api/users', headers: { Authorization: 'Bearer secret' } };
        logRequestDetails(req, REST_RESPONSE, 100);
        const props = Cypress.log.mock.calls[0][0].consoleProps();
        expect(props['Request Headers'].Authorization).toBe('***MASKED***');
    });

    it('masks sensitive request body fields in log message', () => {
        global.Cypress.env.mockReturnValue({ maskFields: ['password'] });
        const req = { method: 'POST', url: '/api/login', body: { username: 'alice', password: 'secret' } };
        logRequestDetails(req, REST_RESPONSE, 100);
        const msg = Cypress.log.mock.calls[0][0].message;
        expect(msg).toContain('***MASKED***');
        expect(msg).not.toContain('secret');
    });

    it('masks sensitive response headers in log message', () => {
        global.Cypress.env.mockReturnValue({ maskFields: ['set-cookie'] });
        const resp = { status: 200, body: { id: 1 }, headers: { 'set-cookie': 'session=abc123' } };
        logRequestDetails(REST_REQUEST, resp, 100);
        const msg = Cypress.log.mock.calls[0][0].message;
        expect(msg).toContain('***MASKED***');
        expect(msg).not.toContain('session=abc123');
    });

    it('masks sensitive response body fields in consoleProps', () => {
        global.Cypress.env.mockReturnValue({ maskFields: ['token'] });
        const resp = { status: 200, body: { token: 'jwt-secret', userId: 1 }, headers: {} };
        logRequestDetails(REST_REQUEST, resp, 100);
        const props = Cypress.log.mock.calls[0][0].consoleProps();
        expect(props['Response Body']).toContain('***MASKED***');
        expect(props['Response Body']).not.toContain('jwt-secret');
    });

    it('does not mask anything when maskFields is empty (default)', () => {
        const req = { method: 'GET', url: '/api/users', headers: { Authorization: 'Bearer secret' } };
        logRequestDetails(req, REST_RESPONSE, 100);
        const props = Cypress.log.mock.calls[0][0].consoleProps();
        expect(props['Request Headers'].Authorization).toBe('Bearer secret');
    });

    it('passes through array response bodies unchanged (masking only applies to objects)', () => {
        global.Cypress.env.mockReturnValue({ maskFields: ['id'] });
        const resp = { status: 200, body: [{ id: 1 }, { id: 2 }], headers: {} };
        logRequestDetails(REST_REQUEST, resp, 100);
        const props = Cypress.log.mock.calls[0][0].consoleProps();
        expect(props['Response Body']).toContain('"id": 1');
    });

    it('masks GraphQL query field when it is in maskFields', () => {
        global.Cypress.env.mockReturnValue({ maskFields: ['query'] });
        const req = { method: 'POST', url: '/graphql', body: { query: '{ users { id } }' } };
        logRequestDetails(req, { status: 200, body: { data: {} }, headers: {} }, 100);
        const msg = Cypress.log.mock.calls[0][0].message;
        expect(msg).toContain('***MASKED***');
    });
});
