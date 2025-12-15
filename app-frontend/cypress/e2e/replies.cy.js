// cypress/e2e/replies.cy.js

describe('Replies - funcionalidad de respuestas a comentarios', () => {
  const movie = {
    tconst: 'tt0120737',
    primaryTitle: 'The Lord of the Rings',
    startYear: 2001,
    description: 'A great movie',
    numVotes: 123456,
    average_rating: 8.8,
    average_soundtrack: 8.5,
    average_acting: 9.0,
    average_cinematography: 8.7,
    average_plot: 8.9,
    poster_path: '/media/posters/tt0120737.png',
  }

  const parentComment = {
    id: 1,
    text: 'Comentario original',
    username: 'user1',
    user_photo: '/media/profile_photos/user_1.jpg',
    parent_id: null,
    like_count: 5,
    reply_count: 12,
    is_liked: false,
    created_at: '2024-01-01T00:00:00Z',
  }

  const parentRating = {
    id: 1,
    movie: movie.tconst,
    user: {
      username: 'user1',
      photo: '/media/profile_photos/user_1.jpg',
    },
    overall_score: 9,
    soundtrack: 9,
    acting: 9,
    cinematography: 9,
    plot: 9,
    comment: 'Comentario original',
  }

  it('muestra la página dedicada con las 10 respuestas mejor valoradas inicialmente', () => {
    // Crear 15 respuestas (las primeras 10 deben mostrarse)
    const replies = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      text: `Respuesta ${i + 1}`,
      username: `user${i + 1}`,
      user_photo: '/media/profile_photos/user_1.jpg',
      parent_id: 1,
      like_count: 15 - i, // Las primeras tienen más likes
      reply_count: 0,
      is_liked: false,
      created_at: `2024-01-${String(i + 2).padStart(2, '0')}T00:00:00Z`,
    }))

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [parentComment],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [parentRating],
    }).as('getRatings')

    // Mock para cuando CommentReplies intenta obtener el rating del usuario
    cy.intercept('GET', `**/movies/ratings/${movie.tconst}/`, {
      statusCode: 404,
      body: {},
    }).as('getUserRating')

    cy.intercept('GET', `**/movies/comments/1/replies/`, {
      statusCode: 200,
      body: replies,
    }).as('getReplies')

    cy.visit(`/movie/${movie.tconst}/comment/1`)

    cy.wait('@getComments')
    cy.wait('@getRatings')
    cy.wait('@getReplies')

    // Debe mostrar el comentario original
    cy.contains('Original Comment').should('be.visible')
    cy.contains('Comentario original').should('be.visible')

    // Debe mostrar la sección de respuestas
    cy.contains('Replies (15)').should('be.visible')

    // Debe mostrar inicialmente 10 respuestas
    cy.get('.replies .user-rating-card').should('have.length', 10)
  })

  it('muestra el botón Back superior para volver a los detalles de la película', () => {
    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [parentComment],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [parentRating],
    }).as('getRatings')

    // Mock para cuando CommentReplies intenta obtener el rating del usuario
    cy.intercept('GET', `**/movies/ratings/${movie.tconst}/`, {
      statusCode: 404,
      body: {},
    }).as('getUserRating')

    cy.intercept('GET', `**/movies/comments/1/replies/`, {
      statusCode: 200,
      body: [],
    }).as('getReplies')

    cy.visit(`/movie/${movie.tconst}/comment/1`)

    cy.wait('@getComments')
    cy.wait('@getRatings')
    cy.wait('@getReplies')

    // Debe mostrar el botón Back
    cy.contains('← Back').should('be.visible')
    cy.contains('← Back').click()

    // Debe redirigir a los detalles de la película
    cy.url().should('include', `/movie/${movie.tconst}`)
    cy.url().should('not.include', '/comment/')
  })

  it('muestra el botón Load more replies que carga 3 respuestas más', () => {
    // Crear 13 respuestas (10 iniciales + 3 más)
    const replies = Array.from({ length: 13 }, (_, i) => ({
      id: i + 1,
      text: `Respuesta ${i + 1}`,
      username: `user${i + 1}`,
      user_photo: '/media/profile_photos/user_1.jpg',
      parent_id: 1,
      like_count: 13 - i,
      reply_count: 0,
      is_liked: false,
      created_at: `2024-01-${String(i + 2).padStart(2, '0')}T00:00:00Z`,
    }))

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [parentComment],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [parentRating],
    }).as('getRatings')

    // Mock para cuando CommentReplies intenta obtener el rating del usuario
    cy.intercept('GET', `**/movies/ratings/${movie.tconst}/`, {
      statusCode: 404,
      body: {},
    }).as('getUserRating')

    cy.intercept('GET', `**/movies/comments/1/replies/`, {
      statusCode: 200,
      body: replies,
    }).as('getReplies')

    cy.visit(`/movie/${movie.tconst}/comment/1`)

    cy.wait('@getComments')
    cy.wait('@getRatings')
    cy.wait('@getReplies')

    // Inicialmente debe mostrar 10 respuestas
    cy.get('.replies .user-rating-card').should('have.length', 10)

    // Debe mostrar el botón "Load more replies"
    cy.contains('Load more replies').should('be.visible')
    cy.contains('Load more replies').click()

    // Ahora debe mostrar 13 respuestas (10 + 3)
    cy.get('.replies .user-rating-card').should('have.length', 13)
  })

  it('muestra el botón Respondre en los comentarios para acceder a la página de editor', () => {
    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [parentComment],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [parentRating],
    }).as('getRatings')

    // Mock para cuando CommentReplies intenta obtener el rating del usuario
    cy.intercept('GET', `**/movies/ratings/${movie.tconst}/`, {
      statusCode: 404,
      body: {},
    }).as('getUserRating')

    cy.intercept('GET', `**/movies/comments/1/replies/`, {
      statusCode: 200,
      body: [],
    }).as('getReplies')

    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit(`/movie/${movie.tconst}/comment/1`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getComments')
    cy.wait('@getRatings')
    cy.wait('@getReplies')

    // Debe mostrar el botón de respuesta (puede ser solo un icono)
    cy.get('.reply-btn').should('be.visible')
    cy.get('.reply-btn').click()

    // Debe mostrar el formulario de respuesta
    cy.contains('Write your reply').should('be.visible')
    cy.get('textarea').should('be.visible')
  })

  it('limita los comentarios a un máximo de 1000 caracteres', () => {
    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [parentComment],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [parentRating],
    }).as('getRatings')

    // Mock para cuando CommentReplies intenta obtener el rating del usuario
    cy.intercept('GET', `**/movies/ratings/${movie.tconst}/`, {
      statusCode: 404,
      body: {},
    }).as('getUserRating')

    cy.intercept('GET', `**/movies/comments/1/replies/`, {
      statusCode: 200,
      body: [],
    }).as('getReplies')

    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit(`/movie/${movie.tconst}/comment/1`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getComments')
    cy.wait('@getRatings')
    cy.wait('@getReplies')

    // Abrir el formulario de respuesta
    cy.get('.reply-btn').click()

    // El textarea debe tener maxlength="1000"
    cy.get('textarea').should('have.attr', 'maxlength', '1000')

    // Debe mostrar el contador de caracteres
    cy.contains('/ 1000 characters').should('be.visible')

    // Escribir 1000 caracteres
    const longText = 'a'.repeat(1000)
    cy.get('textarea').type(longText)

    // El contador debe mostrar 1000 / 1000
    cy.contains('1000 / 1000 characters').should('be.visible')

    // El textarea debe tener exactamente 1000 caracteres (maxlength limita)
    cy.get('textarea').should('have.value', longText)
    cy.get('textarea').should('have.attr', 'maxlength', '1000')
  })
})

