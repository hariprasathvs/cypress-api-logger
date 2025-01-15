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

    it('should log GraphQL queries and responses for PokeAPI', () => {
        const query = `
            {
                pokemon_v2_pokemon(limit: 10) {
                    height
                    id
                    name
                    order
                    pokemon_species_id
                }
            }
        `;

        cy.request({
            method: 'POST',
            url: 'https://beta.pokeapi.co/graphql/v1beta',
            headers: {
                'Content-Type': 'application/json',
            },
            body: {
                query,
            },
        }).then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body).to.have.property('data');
            expect(response.body.data).to.have.property('pokemon_v2_pokemon');
            expect(response.body.data.pokemon_v2_pokemon).to.be.an('array');
            expect(response.body.data.pokemon_v2_pokemon).to.have.length(10);

            // Validate fields of the first Pokémon
            const firstPokemon = response.body.data.pokemon_v2_pokemon[0];
            expect(firstPokemon).to.have.property('id');
            expect(firstPokemon).to.have.property('name');
            expect(firstPokemon).to.have.property('height');
            expect(firstPokemon).to.have.property('order');
            expect(firstPokemon).to.have.property('pokemon_species_id');
        });
    });
});
