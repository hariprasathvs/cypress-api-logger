const { defineConfig } = require("cypress");

module.exports = defineConfig({
  viewportHeight: 1920,
  viewportHeight: 1080,
  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}'
  },
});
