'use strict';

/**
 * Unit tests for the cy.request and cy.intercept command overwrites.
 *
 * Branch map:
 *   cy.request overwrite
 *     R01  calls originalFn with the original args
 *     R02  calls logRequestDetails with request details, response, and duration
 *     R03  returns the response from originalFn
 *
 *   cy.intercept overwrite
 *     I01  Cypress.env('apiLoggerConfig') || {}  — env returns value vs null
 *     I02  !enableApiLogging — true (pass-through) / false (continue)
 *     I03  typeof lastArg === 'function' — false (no handler, pass-through) / true (wrap handler)
 *     I04  wrappedHandler: req.continue callback logs and calls original handler
 */

let requestOverwrite;
let interceptOverwrite;

beforeEach(() => {
    jest.resetModules();

    const captured = {};
    global.Cypress = {
        env: jest.fn().mockReturnValue(null),
        log: jest.fn(),
        Commands: {
            overwrite: jest.fn((name, fn) => {
                captured[name] = fn;
            }),
        },
    };

    require('../src/logger');

    requestOverwrite  = captured['request'];
    interceptOverwrite = captured['intercept'];
});

afterEach(() => {
    jest.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// cy.request overwrite
// ---------------------------------------------------------------------------

describe('cy.request overwrite', () => {
    const MOCK_RESPONSE = { status: 200, body: { data: [] }, headers: { 'content-type': 'application/json' } };

    it('R01 — calls originalFn with all provided arguments', async () => {
        const originalFn = jest.fn().mockResolvedValue(MOCK_RESPONSE);
        const reqOptions  = { method: 'GET', url: '/api/items' };

        await requestOverwrite(originalFn, reqOptions);

        expect(originalFn).toHaveBeenCalledWith(reqOptions);
    });

    it('R02 — calls Cypress.log after the request resolves', async () => {
        const originalFn = jest.fn().mockResolvedValue(MOCK_RESPONSE);

        await requestOverwrite(originalFn, { method: 'GET', url: '/api/items' });

        expect(Cypress.log).toHaveBeenCalled();
    });

    it('R03 — returns the original response unchanged', async () => {
        const originalFn = jest.fn().mockResolvedValue(MOCK_RESPONSE);

        const result = await requestOverwrite(originalFn, { method: 'GET', url: '/api/items' });

        expect(result).toBe(MOCK_RESPONSE);
    });

    it('measures duration between request start and response', async () => {
        const originalFn = jest.fn().mockResolvedValue(MOCK_RESPONSE);

        await requestOverwrite(originalFn, { method: 'GET', url: '/api/items' });

        const logArg = Cypress.log.mock.calls[0][0];
        const props  = logArg.consoleProps();
        expect(props['Duration (ms)']).toBeGreaterThanOrEqual(0);
    });
});

// ---------------------------------------------------------------------------
// cy.intercept overwrite — I01 / I02
// ---------------------------------------------------------------------------

describe('cy.intercept overwrite — enableApiLogging guard', () => {
    it('I01 — uses {} when Cypress.env returns null (no config set)', () => {
        global.Cypress.env.mockReturnValue(null);
        const originalFn = jest.fn();
        const handler    = jest.fn();

        interceptOverwrite(originalFn, 'GET', '/api', handler);

        // Should have wrapped the handler (i.e. not passed handler directly)
        expect(originalFn).toHaveBeenCalledWith('GET', '/api', expect.any(Function));
        const passedFn = originalFn.mock.calls[0][2];
        expect(passedFn).not.toBe(handler);
    });

    it('I01 — uses the config object when Cypress.env returns one', () => {
        global.Cypress.env.mockReturnValue({ enableApiLogging: true });
        const originalFn = jest.fn();
        const handler    = jest.fn();

        interceptOverwrite(originalFn, 'GET', '/api', handler);

        expect(originalFn).toHaveBeenCalled();
    });

    it('I02 — passes args through unchanged when enableApiLogging is false', () => {
        global.Cypress.env.mockReturnValue({ enableApiLogging: false });
        const originalFn = jest.fn();
        const handler    = jest.fn();

        interceptOverwrite(originalFn, 'GET', '/api', handler);

        // handler must be passed as-is (not wrapped)
        expect(originalFn).toHaveBeenCalledWith('GET', '/api', handler);
    });

    it('I02 — continues to wrap handler when enableApiLogging is true', () => {
        global.Cypress.env.mockReturnValue({ enableApiLogging: true });
        const originalFn = jest.fn();
        const handler    = jest.fn();

        interceptOverwrite(originalFn, 'GET', '/api', handler);

        const passedFn = originalFn.mock.calls[0][2];
        expect(passedFn).not.toBe(handler);
    });
});

// ---------------------------------------------------------------------------
// cy.intercept overwrite — I03: no handler / static stub pass-through
// ---------------------------------------------------------------------------

describe('cy.intercept overwrite — no handler (pass-through)', () => {
    it('I03 false — passes args unchanged when no last argument is provided (url only)', () => {
        const originalFn = jest.fn();

        interceptOverwrite(originalFn, '/api/items');

        expect(originalFn).toHaveBeenCalledWith('/api/items');
    });

    it('I03 false — passes args unchanged when last argument is a static response object', () => {
        const originalFn = jest.fn();
        const staticStub = { statusCode: 200, body: { data: [] } };

        interceptOverwrite(originalFn, 'GET', '/api/items', staticStub);

        expect(originalFn).toHaveBeenCalledWith('GET', '/api/items', staticStub);
    });

    it('I03 false — passes args unchanged for method+url without handler', () => {
        const originalFn = jest.fn();

        interceptOverwrite(originalFn, 'POST', '/api/items');

        expect(originalFn).toHaveBeenCalledWith('POST', '/api/items');
    });
});

// ---------------------------------------------------------------------------
// cy.intercept overwrite — I04: wrappedHandler execution
// ---------------------------------------------------------------------------

describe('cy.intercept overwrite — wrappedHandler execution', () => {
    function buildMockReqRes() {
        const mockRes = { statusCode: 201, headers: { 'content-type': 'application/json' }, body: { id: 99 } };
        const mockReq = {
            method: 'POST',
            url: '/api/items',
            headers: { 'content-type': 'application/json' },
            body: { name: 'New Item' },
            continue: jest.fn((cb) => cb(mockRes)),
        };
        return { mockReq, mockRes };
    }

    it('I04 — wrappedHandler calls req.continue', () => {
        const originalFn = jest.fn();
        const handler    = jest.fn();

        interceptOverwrite(originalFn, 'POST', '/api/items', handler);

        const wrappedHandler = originalFn.mock.calls[0][2];
        const { mockReq }    = buildMockReqRes();

        wrappedHandler(mockReq);

        expect(mockReq.continue).toHaveBeenCalled();
    });

    it('I04 — wrappedHandler logs the intercepted request/response via Cypress.log', () => {
        const originalFn = jest.fn();
        const handler    = jest.fn();

        interceptOverwrite(originalFn, 'POST', '/api/items', handler);

        const wrappedHandler = originalFn.mock.calls[0][2];
        const { mockReq }    = buildMockReqRes();

        wrappedHandler(mockReq);

        expect(Cypress.log).toHaveBeenCalled();
        const logArg = Cypress.log.mock.calls[0][0];
        expect(logArg.message).toContain('POST : /api/items');
    });

    it('I04 — wrappedHandler calls the original handler after logging', () => {
        const originalFn = jest.fn();
        const handler    = jest.fn();

        interceptOverwrite(originalFn, 'POST', '/api/items', handler);

        const wrappedHandler = originalFn.mock.calls[0][2];
        const { mockReq }    = buildMockReqRes();

        wrappedHandler(mockReq);

        expect(handler).toHaveBeenCalledWith(mockReq);
    });

    it('I04 — wrappedHandler builds request/response details from req and res objects', () => {
        const originalFn = jest.fn();
        const handler    = jest.fn();

        interceptOverwrite(originalFn, 'POST', '/api/items', handler);

        const wrappedHandler = originalFn.mock.calls[0][2];
        const { mockReq }    = buildMockReqRes();

        wrappedHandler(mockReq);

        const props = Cypress.log.mock.calls[0][0].consoleProps();
        expect(props['Request Method']).toBe('POST');
        expect(props['Request URL']).toBe('/api/items');
        expect(props['Response Status']).toBe(201);
    });

    it('I04 — wrappedHandler correctly replaces only the last arg with the wrapped handler', () => {
        const originalFn   = jest.fn();
        const handler      = jest.fn();

        // Three-arg form: method, url, handler
        interceptOverwrite(originalFn, 'DELETE', '/api/items/1', handler);

        expect(originalFn).toHaveBeenCalledWith('DELETE', '/api/items/1', expect.any(Function));
        // First two args preserved exactly
        expect(originalFn.mock.calls[0][0]).toBe('DELETE');
        expect(originalFn.mock.calls[0][1]).toBe('/api/items/1');
    });
});
