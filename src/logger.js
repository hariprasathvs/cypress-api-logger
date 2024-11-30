/// <reference types="cypress" />

// Function to truncate strings longer than a specified length
const truncateResponseBody = (body, maxLength = 500) => {
    // If the body is an object or array, stringify it first
    const stringifiedBody = typeof body === 'string' ? body : JSON.stringify(body);

    if (stringifiedBody.length > maxLength) {
        return stringifiedBody.substring(0, maxLength) + '...'; // Truncate and add ellipsis
    }
    return stringifiedBody; // Return the body as is if it's shorter than maxLength
};

// Create a custom log outside the overwrite function
const logRequestDetails = (requestDetails, response, duration) => {
    const method = requestDetails.method || 'GET';
    const url = typeof requestDetails === 'string' ? requestDetails : requestDetails.url;
    const requestBody = requestDetails.body || null;
    const requestHeaders = requestDetails.headers || {};

    // Truncate the response body if it's too large
    const truncatedResponseBody = truncateResponseBody(response.body);

    // You can set `$el` to `null` if you don't have a DOM element to associate with
    const $el = null; // Optional: can be linked to any DOM element, like cy.get('selector').first()

    // Create a custom log with Cypress.log
    Cypress.log({
        name: 'Custom Log',
        displayName: 'LOGGER',
        message: `
            **Request Method**: ${method}
            **Request URL**: ${url}
            **Request Body**: ${JSON.stringify(requestBody, null, 2)}
            **Request Headers**: ${JSON.stringify(requestHeaders, null, 2)}
            **Response Status**: ${response.status}
            **Response Headers**: ${JSON.stringify(response.headers, null, 2)}
            **Response Body**: ${truncatedResponseBody}
            **Duration (ms)**: ${duration}
        `,
        $el,  // Optional: can be a specific element if needed (otherwise `null` is fine)
        consoleProps: () => {}
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
