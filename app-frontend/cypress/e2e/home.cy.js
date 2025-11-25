// cypress/e2e/home.cy.js

describe('Home - catálogo de películas', () => {
  it('muestra la cabecera y una lista de películas usando el backend real', () => {
    cy.visit('/')

    cy.contains('Loading movies…').should('be.visible')
    cy.contains('Loading movies…').should('not.exist')

    cy.contains('CINEMA UB').should('be.visible')
    cy.contains('Log in').should('be.visible')
    cy.contains('Sign up').should('be.visible')

    cy.get('.grid .card')
      .its('length')
      .should('be.greaterThan', 0)

    cy.get('.grid .card img')
      .first()
      .should('have.attr', 'src')
      .and('match', /\/media\/posters\//)
  })

  it('muestra un mensaje de error cuando la API de películas falla', () => {
    cy.intercept('GET', '**/movies/', {
      statusCode: 500,
      body: {},
    }).as('getMoviesError')

    cy.visit('/')

    cy.wait('@getMoviesError')

    cy.contains('Failed to load movies. Please try again later.')
      .should('be.visible')

    cy.get('.grid').should('not.exist')
    cy.get('.pagination-controls').should('not.exist')
  })

  it('filtra las películas usando la barra de búsqueda con datos reales del backend', () => {
    cy.visit('/')

    cy.contains('Loading movies…').should('be.visible')
    cy.contains('Loading movies…').should('not.exist')

    cy.get('.grid .card')
      .its('length')
      .should('be.greaterThan', 1)

    cy.get('.grid .card')
      .first()
      .find('h3')
      .invoke('text')
      .then((fullTitle) => {
        const query = fullTitle.split(' (')[0].trim()

        cy.get('.search-input').clear().type(query)

        cy.get('.grid .card').should('have.length.at.least', 1)

        cy.get('.grid .card')
          .first()
          .contains(query)
      })
  }),
  it('aplica filtros por género y resetea la página a 1', () => {
    // 1) Mock de la API con 15 películas (para tener 2 páginas)
    const movies = []

    // 10 pelis de Drama
    for (let i = 1; i <= 10; i++) {
      movies.push({
        tconst: `tt00000${i}`,
        primaryTitle: `Drama Movie ${i}`,
        startYear: 2000 + i,
        average_rating: 7 + i * 0.1,
        poster_path: `/media/posters/tt00000${i}.jpg`,
        genres: ['Drama'],
      })
    }

    // 5 pelis de Action (las que nos interesan para el filtro)
    for (let i = 11; i <= 15; i++) {
      movies.push({
        tconst: `tt00000${i}`,
        primaryTitle: `Action Movie ${i}`,
        startYear: 2000 + i,
        average_rating: 6 + i * 0.1,
        poster_path: `/media/posters/tt00000${i}.jpg`,
        genres: ['Action'],
      })
    }

    cy.intercept('GET', '**/movies/', {
      statusCode: 200,
      body: movies,
    }).as('getMoviesWithGenres')

    // 2) Visitamos la Home
    cy.visit('/')

    // Esperamos a que cargue
    cy.wait('@getMoviesWithGenres')

    // ✅ Comprobamos que estamos en la página 1 inicialmente
    cy.contains('Page 1 / 2').should('be.visible')
    cy.contains('Showing 1–10 of 15').should('be.visible')

    // 3) Pasamos a la página 2
    cy.contains('Next').click()

    // Ahora debería mostrar página 2 / 2 y 11–15
    cy.contains('Page 2 / 2').should('be.visible')
    cy.contains('Showing 11–15 of 15').should('be.visible')

    // 4) Aplicamos filtro de género "Action"
    cy.get('#genre').select('Action')   // select con id="genre" en MovieFilter
    cy.contains('Apply Filters').click()

    // 5) Después de aplicar el filtro, la página debe resetearse a 1
    cy.contains('Page 1 / 1').should('be.visible')
    cy.contains('Showing 1–5 of 5').should('be.visible')

    // Además, solo deben aparecer las pelis de "Action"
    cy.get('.grid .card')
      .should('have.length', 5)
      .each(($card) => {
        cy.wrap($card).contains('Action Movie').should('exist')
      })

    // Y el botón "Prev" debe estar deshabilitado (estamos en página 1)
    cy.contains('Prev').should('be.disabled')

    // Y "Next" también, porque solo hay 1 página
    cy.contains('Next').should('be.disabled')
  })
})
