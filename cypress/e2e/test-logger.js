import '../../src/logger.js'

describe('Custom cy.request Command', () => {
    it('Logs request and response details', () => {
        cy.request({
            method: 'GET',
            url: 'https://jsonplaceholder.typicode.com/posts'
        }).then((response) => {
            expect(response.status).to.eq(200);
        });
    });
});
