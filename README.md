# Cypress API Logger

`cypress-api-logger` is a Cypress plugin that logs detailed information about API requests and responses directly in the Cypress Test Runner. This tool helps you monitor and debug API interactions efficiently during your test execution.

## Features

- Logs HTTP request details: method, URL, headers, body, etc.
- Logs HTTP response details: status, headers, body, duration, etc.
- Easy integration into existing Cypress projects.
- Provides visibility into API interactions, helping to identify issues faster.

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
  `['method', 'url', 'status', 'requestBody', 'requestHeaders', 'responseBody', 'responseHeaders', 'duration']`  
  Specifies which fields should be displayed in the logs.  

    - **`enableApiLogging`**: `true`  
  Toggles API logging. When set to `false`, no logs will be displayed.  

        #### Example Usage:  

        To customize the configuration, add the following to your Cypress test or environment file:  

        ```javascript
        Cypress.env('apiLoggerConfig', {
          maxBodyLines: 100,
          displayFields: ['method', 'url', 'status'],
          enableApiLogging: false,
        });
        ```

   
2. **Per-Request Configuration**: 
   Users can also customize the logging behavior on a per-request basis by passing a `config` object inside the `cy.request()` options.

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
