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

    if (displayFields.includes('requestHeaders') && requestHeaders) {
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
