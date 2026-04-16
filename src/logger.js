/// <reference types="cypress" />

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
    } = { ...defaultConfig, ...config };

    if (!enableApiLogging) {
        return;
    }

    const method = requestDetails.method || 'GET';
    const url = typeof requestDetails === 'string' ? requestDetails : requestDetails.url;
    const requestBody = requestDetails.body || null;
    const requestHeaders = requestDetails.headers || {};
    const truncatedResponseBody = response.body
        ? JSON.stringify(response.body, null, 2).split('\n').slice(0, maxBodyLines).join('\n')
        : 'No Response Body';

    const isGraphQL = url.includes('/graphql') || (requestBody && typeof requestBody.query === 'string');
    const query = isGraphQL && requestBody?.query ? requestBody.query : undefined;
    const variables = isGraphQL && requestBody?.variables ? requestBody.variables : undefined;

    // GraphQL Check
    if (isGraphQL && !enableGraphQLLogging) {
        console.log('GraphQL logging is disabled. Skipping logging for this request.');
        return;
    }

    // Build the log message based on the displayFields
    let logMessage = `--- **LOGGING STARTED FOR** ${method} : ${url} \n`;

    if (displayFields.includes('status')) {
        logMessage += ` | **Status**: ${response.status}\n`;
    }

    if (displayFields.includes('requestHeaders')) {
        logMessage += ` | **Request Headers**: ${JSON.stringify(requestHeaders, null, 2)}\n`;
    }

    if (displayFields.includes('requestBody') && requestBody) {
        logMessage += ` | **Request Body**: ${JSON.stringify(requestBody, null, 2)}\n`;
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
        logMessage += ` | **Response Headers**: ${JSON.stringify(response.headers, null, 2)}\n`;
    }

    if (displayFields.includes('responseBody') && response.body) {
        logMessage += ` | **Response Body**: \n${truncatedResponseBody}\n`;
    }

    if (displayFields.includes('duration') && duration) {
        logMessage += ` | **Duration**: ${duration}ms\n`;
    }

    Cypress.log({
        name: isGraphQL ? 'GraphQL Log' : 'Custom Log',
        displayName: isGraphQL ? 'GRAPHQL LOGGER' : 'LOGGER',
        message: logMessage,
        consoleProps: () => ({
            'Request Method': method,
            'Request URL': url,
            'Request Body': requestBody,
            'Request Headers': requestHeaders,
            'GraphQL Query': query,
            'GraphQL Variables': variables,
            'Response Status': response.status,
            'Response Body': truncatedResponseBody,
            'Response Headers': JSON.stringify(response.headers, null, 2),
            'Duration (ms)': duration,
        }),
    });
};

// Export for unit testing (webpack used by Cypress also defines module)
module.exports = { logRequestDetails };

// Overwrite the cy.request command
Cypress.Commands.overwrite('request', (originalFn, ...args) => {
    const startTime = Date.now();

    return originalFn(...args).then((response) => {
        const duration = Date.now() - startTime;

        // Extract request details
        const requestDetails = args[0];

        // Call the custom log function with request, response, and duration
        logRequestDetails(requestDetails, response, duration);

        // Return the response
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
