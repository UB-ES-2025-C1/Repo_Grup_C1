// cypress/e2e/movie-info.cy.js

describe('Movie detail - MovieInfo', () => {
  const tconst = 'tt0120737'

  const movie = {
    tconst,
    primaryTitle: 'The Lord of the Rings: The Fellowship of the Ring',
    startYear: 2001,
    description: 'Epic fantasy adventure.',
    average_rating: 8.8,
    numVotes: 123456,
    poster_path: '/media/posters/tt0120737.png',
  }

  const userRating = {
    id: 1,
    movie: tconst,
    overall_score: 9,
    soundtrack: 9,
    acting: 9,
    cinematography: 10,
    plot: 9,
    comment: 'Amazing movie!',
    user: {
      username: 'testuser',
      id: 1,
      photo: '/media/profile_photos/user_1.jpg',
    },
  }

  it('muestra los detalles de la película cuando la carga tiene éxito y el usuario no tiene rating', () => {
    // Mock de la película
    cy.intercept('GET', '**/movies/tt0120737/', {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    // Mock del rating del usuario -> 404 = no hay rating
    cy.intercept('GET', '**/movies/ratings/tt0120737/', {
      statusCode: 404,
      body: {},
    }).as('getUserRating404')

    // Visitamos la página de detalle
    cy.visit(`/movie/${tconst}`)

    // Esperamos a que se cargue la película
    cy.wait('@getMovie')

    // Comprueba que se ve el título, el año y datos básicos
    cy.contains(movie.primaryTitle).should('be.visible')
    cy.contains(`(${movie.startYear})`).should('be.visible')
    cy.contains('Overall rating:').should('be.visible')
    cy.contains(movie.average_rating.toString()).should('be.visible')
    cy.contains(movie.numVotes.toLocaleString()).should('be.visible')

    // El título "Your rating" siempre está visible, pero no debería aparecer el contenido del rating
    cy.contains('Your rating').should('be.visible')
    cy.contains("You haven't rated this movie yet.").should('be.visible')
    cy.contains('Delete rating').should('not.exist')
    cy.contains('Delete comment').should('not.exist')

    // El botón principal debería ser "Rate"
    cy.contains('Rate').should('be.visible')
  })

  it('muestra la valoración del usuario y los botones de cambio/borrado cuando existe un rating', () => {
    // Mock de la película
    cy.intercept('GET', '**/movies/tt0120737/', {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    // Mock del rating del usuario
    cy.intercept('GET', '**/movies/ratings/tt0120737/', {
      statusCode: 200,
      body: userRating,
    }).as('getUserRating')

    // Mock del perfil del usuario (AppHeader hace esta petición cuando está logueado)
    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    // Mock de ratings públicos (el componente también hace esta petición)
    cy.intercept('GET', '**/movies/tt0120737/ratings/', {
      statusCode: 200,
      body: [],
    }).as('getPublicRatings')

    // Simulamos que el usuario está logueado (token en localStorage)
    cy.visit(`/movie/${tconst}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
      },
    })

    cy.wait('@getMovie')
    cy.wait('@getUserRating')

    // Bloque de rating del usuario visible
    cy.contains('Your rating').should('be.visible')
    // El CommentCard muestra el overall_score como número, no como "Overall: 9"
    cy.get('.user-rating-card .overall').should('contain', userRating.overall_score.toString())
    // El comentario se muestra entre comillas
    cy.contains(`"${userRating.comment}"`).should('be.visible')

    // Botón de cambiar rating + borrar rating/comentario
    cy.contains('Change rating').should('be.visible')
    cy.contains('Delete rating').should('be.visible')
    cy.contains('Delete comment').should('be.visible')
  })

  it('muestra un mensaje de error cuando la API de detalles falla', () => {
    const invalidTconst = 'tt4040000'

    // Mock de error al pedir la película
    cy.intercept('GET', `**/movies/${invalidTconst}/`, {
      statusCode: 404,
      body: {},
    }).as('getMovieError')

    // Visitamos el detalle de una película que no existe
    cy.visit(`/movie/${invalidTconst}`)

    cy.wait('@getMovieError')

    // Debe mostrarse el mensaje de error
    cy.contains('Movie not found.').should('be.visible')

    // Y no debe existir el bloque de detalles
    cy.get('.movie-details').should('not.exist')
  })
})
