/// <reference types="cypress" />

const maskSensitiveData = (obj, maskFields) => {
    if (!obj || typeof obj !== 'object' || maskFields.length === 0) return obj;
    if (Array.isArray(obj)) return obj;
    const result = { ...obj };
    Object.keys(result).forEach((key) => {
        if (maskFields.some((f) => f.toLowerCase() === key.toLowerCase())) {
            result[key] = '***MASKED***';
        }
    });
    return result;
};

// Checks whether a URL matches any pattern in the list.
// Used by both excludeUrls (skip if matched) and includeUrls (skip if NOT matched).
const isUrlMatch = (url, patterns) => {
    return patterns.some((pattern) => {
        if (pattern.includes('*')) {
            return new RegExp(pattern.replace(/\*/g, '.*')).test(url);
        }
        return url.includes(pattern);
    });
};

const logRequestDetails = (requestDetails, response, duration, config = {}) => {
    const defaultConfig = Cypress.env('apiLoggerConfig') || {};

    const {
        enableApiLogging = true,
        maxBodyLines = 50,
        displayFields = [
            'method',
            'url',
            'status',
            'requestBody',
            'requestHeaders',
            'responseBody',
            'responseHeaders',
            'duration',
            'graphqlQuery',
        ],
        enableGraphQLLogging = true,
        graphQLFields = ['query', 'variables', 'responseBody'],
        excludeUrls = [],
        includeUrls = [],
        logOnlyFailures = false,
        maskFields = [],
        slowThreshold = null,
        onLog = null,
    } = { ...defaultConfig, ...config };

    if (!enableApiLogging) {
        return;
    }

    const method = requestDetails.method || 'GET';
    const url = typeof requestDetails === 'string' ? requestDetails : requestDetails.url;

    if (excludeUrls.length > 0 && isUrlMatch(url, excludeUrls)) {
        return;
    }

    if (includeUrls.length > 0 && !isUrlMatch(url, includeUrls)) {
        return;
    }

    if (logOnlyFailures && response.status < 400) {
        return;
    }

    const requestBody = requestDetails.body || null;
    const requestHeaders = requestDetails.headers || {};

    const maskedRequestHeaders  = maskSensitiveData(requestHeaders, maskFields);
    const maskedRequestBody     = maskSensitiveData(requestBody, maskFields);
    const maskedResponseHeaders = maskSensitiveData(response.headers, maskFields);
    const maskedResponseBody    = response.body ? maskSensitiveData(response.body, maskFields) : null;

    const truncatedResponseBody = maskedResponseBody
        ? JSON.stringify(maskedResponseBody, null, 2).split('\n').slice(0, maxBodyLines).join('\n')
        : 'No Response Body';

    const isGraphQL = url.includes('/graphql') || (requestBody && typeof requestBody.query === 'string');
    const query     = isGraphQL && maskedRequestBody?.query     ? maskedRequestBody.query     : undefined;
    const variables = isGraphQL && maskedRequestBody?.variables ? maskedRequestBody.variables : undefined;

    if (isGraphQL && !enableGraphQLLogging) {
        console.log('GraphQL logging is disabled. Skipping logging for this request.');
        return;
    }

    const isSlow = slowThreshold !== null && duration > slowThreshold;

    let logMessage = `--- **LOGGING STARTED FOR** ${method} : ${url} \n`;

    if (displayFields.includes('status')) {
        logMessage += ` | **Status**: ${response.status}\n`;
    }

    if (displayFields.includes('requestHeaders')) {
        logMessage += ` | **Request Headers**: ${JSON.stringify(maskedRequestHeaders, null, 2)}\n`;
    }

    if (displayFields.includes('requestBody') && requestBody) {
        logMessage += ` | **Request Body**: ${JSON.stringify(maskedRequestBody, null, 2)}\n`;
    }

    if (isGraphQL && enableGraphQLLogging) {
        if (displayFields.includes('graphqlQuery')) {
            if (graphQLFields.includes('query') && query) {
                logMessage += ` | **GraphQL Query**: \n${query}\n`;
            }

            if (graphQLFields.includes('variables') && variables) {
                logMessage += ` | **GraphQL Variables**: ${JSON.stringify(variables, null, 2)}\n`;
            }
        }
    }

    if (displayFields.includes('responseHeaders') && response.headers) {
        logMessage += ` | **Response Headers**: ${JSON.stringify(maskedResponseHeaders, null, 2)}\n`;
    }

    if (displayFields.includes('responseBody') && response.body) {
        logMessage += ` | **Response Body**: \n${truncatedResponseBody}\n`;
    }

    if (displayFields.includes('duration') && duration) {
        logMessage += ` | **Duration**: ${duration}ms\n`;
    }

    if (isSlow) {
        logMessage += ` | ⚠ **SLOW REQUEST**: ${duration}ms exceeded ${slowThreshold}ms threshold\n`;
    }

    Cypress.log({
        name: isGraphQL ? 'GraphQL Log' : 'Custom Log',
        displayName: isSlow
            ? (isGraphQL ? '⚠ SLOW GRAPHQL' : '⚠ SLOW LOGGER')
            : (isGraphQL ? 'GRAPHQL LOGGER' : 'LOGGER'),
        message: logMessage,
        consoleProps: () => ({
            'Request Method': method,
            'Request URL': url,
            'Request Body': maskedRequestBody,
            'Request Headers': maskedRequestHeaders,
            'GraphQL Query': query,
            'GraphQL Variables': variables,
            'Response Status': response.status,
            'Response Body': truncatedResponseBody,
            'Response Headers': JSON.stringify(maskedResponseHeaders, null, 2),
            'Duration (ms)': duration,
            'Slow Request': isSlow,
        }),
    });

    if (typeof onLog === 'function') {
        onLog({
            method,
            url,
            status: response.status,
            duration,
            requestBody: maskedRequestBody,
            requestHeaders: maskedRequestHeaders,
            responseBody: maskedResponseBody,
            responseHeaders: maskedResponseHeaders,
            isGraphQL,
            isSlow,
        });
    }
};

// Export for unit testing (webpack used by Cypress also defines module)
module.exports = { logRequestDetails, maskSensitiveData, isUrlMatch };

// Overwrite the cy.request command
Cypress.Commands.overwrite('request', (originalFn, ...args) => {
    const startTime = Date.now();

    return originalFn(...args).then((response) => {
        const duration = Date.now() - startTime;
        const requestDetails = args[0];
        logRequestDetails(requestDetails, response, duration);
        return response;
    });
});

// Overwrite cy.intercept to automatically log matched requests/responses
Cypress.Commands.overwrite('intercept', (originalFn, ...args) => {
    const defaultConfig = Cypress.env('apiLoggerConfig') || {};
    const { enableApiLogging = true } = defaultConfig;

    if (!enableApiLogging) {
        return originalFn(...args);
    }

    // Locate and wrap a routeHandler function if one was provided.
    // cy.intercept signatures:
    //   (url)
    //   (method, url)
    //   (routeMatcher)
    //   (url, routeHandler)
    //   (method, url, routeHandler)
    //   (routeMatcher, routeHandler)
    const lastArg = args[args.length - 1];
    const hasHandler = typeof lastArg === 'function';

    if (!hasHandler) {
        return originalFn(...args);
    }

    const originalHandler = lastArg;

    const wrappedHandler = (req) => {
        const startTime = Date.now();
        const originalContinue = req.continue.bind(req);

        // Replace req.continue on the req object so when originalHandler calls it,
        // our wrapper intercepts the response to add logging — avoiding a double
        // req.continue call which would throw because the request is already resolved.
        req.continue = (responseHandler) => {
            return originalContinue((res) => {
                const duration = Date.now() - startTime;

                const requestDetails = {
                    method: req.method,
                    url: req.url,
                    headers: req.headers,
                    body: req.body,
                };

                const response = {
                    status: res.statusCode,
                    headers: res.headers,
                    body: res.body,
                };

                logRequestDetails(requestDetails, response, duration);

                if (typeof responseHandler === 'function') {
                    responseHandler(res);
                }
            });
        };

        originalHandler(req);
    };

    const newArgs = [...args.slice(0, -1), wrappedHandler];
    return originalFn(...newArgs);
});
