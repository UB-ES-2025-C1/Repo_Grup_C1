// cypress/e2e/comments.cy.js

describe('Comments - funcionalidad de comentarios', () => {
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

  it('muestra los comentarios debajo de los detalles de la película sin necesidad de hacer login', () => {
    const comments = [
      {
        id: 1,
        text: 'Excelente película',
        username: 'user1',
        user_photo: '/media/profile_photos/user_1.jpg',
        parent_id: null,
        like_count: 5,
        reply_count: 2,
        is_liked: false,
        created_at: '2024-01-01T00:00:00Z',
      },
    ]

    const ratings = [
      {
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
        comment: 'Excelente película',
      },
    ]

    // Mock de la película
    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    // Mock de comments
    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: comments,
    }).as('getComments')

    // Mock de ratings
    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: ratings,
    }).as('getRatings')

    // No hay token en localStorage (usuario no autenticado)
    cy.visit(`/movie/${movie.tconst}`)

    cy.wait('@getMovie')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // Debe mostrar la sección de comentarios
    cy.contains('Other reviews').should('be.visible')
    cy.contains('Excelente película').should('be.visible')
  })

  it('ordena los comentarios por likes primero, luego por fecha (más recientes primero)', () => {
    const comments = [
      {
        id: 1,
        text: 'Comentario con pocos likes',
        username: 'user1',
        user_photo: '/media/profile_photos/user_1.jpg',
        parent_id: null,
        like_count: 1,
        reply_count: 0,
        is_liked: false,
        created_at: '2024-01-02T00:00:00Z', // Más reciente
      },
      {
        id: 2,
        text: 'Comentario con muchos likes',
        username: 'user2',
        user_photo: '/media/profile_photos/user_2.jpg',
        parent_id: null,
        like_count: 10,
        reply_count: 0,
        is_liked: false,
        created_at: '2024-01-01T00:00:00Z', // Más antiguo
      },
      {
        id: 3,
        text: 'Comentario reciente sin likes',
        username: 'user3',
        user_photo: '/media/profile_photos/user_3.jpg',
        parent_id: null,
        like_count: 0,
        reply_count: 0,
        is_liked: false,
        created_at: '2024-01-03T00:00:00Z', // Más reciente
      },
    ]

    const ratings = [
      {
        id: 1,
        movie: movie.tconst,
        user: { username: 'user1', photo: '/media/profile_photos/user_1.jpg' },
        overall_score: 8,
        soundtrack: 8,
        acting: 8,
        cinematography: 8,
        plot: 8,
        comment: 'Comentario con pocos likes',
        date: '2024-01-02T00:00:00Z',
      },
      {
        id: 2,
        movie: movie.tconst,
        user: { username: 'user2', photo: '/media/profile_photos/user_2.jpg' },
        overall_score: 9,
        soundtrack: 9,
        acting: 9,
        cinematography: 9,
        plot: 9,
        comment: 'Comentario con muchos likes',
        date: '2024-01-01T00:00:00Z',
      },
      {
        id: 3,
        movie: movie.tconst,
        user: { username: 'user3', photo: '/media/profile_photos/user_3.jpg' },
        overall_score: 7,
        soundtrack: 7,
        acting: 7,
        cinematography: 7,
        plot: 7,
        comment: 'Comentario reciente sin likes',
        date: '2024-01-03T00:00:00Z',
      },
    ]

    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: comments,
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: ratings,
    }).as('getRatings')

    cy.visit(`/movie/${movie.tconst}`)

    cy.wait('@getMovie')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // El comentario con más likes debe aparecer primero
    cy.contains('Other reviews').should('be.visible')
    cy.get('.comments-list .user-rating-card').first().should('contain', 'Comentario con muchos likes')
    
    // Entre los que tienen 0 likes, el más reciente debe aparecer primero
    cy.get('.comments-list .user-rating-card').eq(1).should('contain', 'Comentario reciente sin likes')
    cy.get('.comments-list .user-rating-card').eq(2).should('contain', 'Comentario con pocos likes')
  })

  it('muestra el comentario del usuario registrado primero si ha hecho uno', () => {
    const userComment = {
      id: 1,
      text: 'Mi comentario',
      username: 'testuser',
      user_photo: '/media/profile_photos/user_1.jpg',
      parent_id: null,
      like_count: 0,
      reply_count: 0,
      is_liked: false,
      created_at: '2024-01-01T00:00:00Z',
    }

    const otherComment = {
      id: 2,
      text: 'Otro comentario',
      username: 'otheruser',
      user_photo: '/media/profile_photos/user_2.jpg',
      parent_id: null,
      like_count: 0,
      reply_count: 0,
      is_liked: false,
      created_at: '2024-01-02T00:00:00Z',
    }

    const userRating = {
      id: 1,
      movie: movie.tconst,
      user: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
      overall_score: 9,
      soundtrack: 9,
      acting: 9,
      cinematography: 9,
      plot: 9,
      comment: 'Mi comentario',
    }

    const otherRating = {
      id: 2,
      movie: movie.tconst,
      user: {
        username: 'otheruser',
        photo: '/media/profile_photos/user_2.jpg',
      },
      overall_score: 8,
      soundtrack: 8,
      acting: 8,
      cinematography: 8,
      plot: 8,
      comment: 'Otro comentario',
    }

    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [userComment, otherComment],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [userRating, otherRating],
    }).as('getRatings')

    cy.intercept('GET', `**/movies/ratings/${movie.tconst}/`, {
      statusCode: 200,
      body: userRating,
    }).as('getUserRating')

    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit(`/movie/${movie.tconst}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getMovie')
    cy.wait('@getUserRating')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // Debe mostrar "Your rating" primero
    cy.contains('Your rating').should('be.visible')
    cy.contains('Mi comentario').should('be.visible')

    // Luego "Other reviews"
    cy.contains('Other reviews').should('be.visible')
    cy.contains('Otro comentario').should('be.visible')
  })

  it('muestra paginación cuando hay más de 10 comentarios', () => {
    // Crear 15 comentarios
    const comments = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      text: `Comentario ${i + 1}`,
      username: `user${i + 1}`,
      user_photo: '/media/profile_photos/user_1.jpg',
      parent_id: null,
      like_count: 0,
      reply_count: 0,
      is_liked: false,
      created_at: `2024-01-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
    }))

    const ratings = Array.from({ length: 15 }, (_, i) => ({
      id: i + 1,
      movie: movie.tconst,
      user: {
        username: `user${i + 1}`,
        photo: '/media/profile_photos/user_1.jpg',
      },
      overall_score: 8,
      soundtrack: 8,
      acting: 8,
      cinematography: 8,
      plot: 8,
      comment: `Comentario ${i + 1}`,
    }))

    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: comments,
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: ratings,
    }).as('getRatings')

    cy.visit(`/movie/${movie.tconst}`)

    cy.wait('@getMovie')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // Debe mostrar controles de paginación (2 páginas: 10 + 5)
    cy.contains('Other reviews').should('be.visible')
    cy.get('.pagination').should('be.visible')
    cy.get('.pagination button').should('have.length.at.least', 3) // Prev, números, Next

    // Debe mostrar página 1 activa
    cy.get('.pagination button.active').should('contain', '1')
  })

  it('muestra la valoración del usuario debajo de los comentarios de la película', () => {
    const userRating = {
      id: 1,
      movie: movie.tconst,
      user: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
      overall_score: 9,
      soundtrack: 9,
      acting: 9,
      cinematography: 9,
      plot: 9,
      comment: 'Mi valoración',
    }

    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    cy.intercept('GET', `**/movies/ratings/${movie.tconst}/`, {
      statusCode: 200,
      body: userRating,
    }).as('getUserRating')

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [],
    }).as('getRatings')

    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit(`/movie/${movie.tconst}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getMovie')
    cy.wait('@getUserRating')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // Debe mostrar "Your rating" antes de "Other reviews"
    cy.contains('Your rating').should('be.visible')
    cy.contains('Mi valoración').should('be.visible')
  })

  it('muestra el botón para editar la valoración que lleva a la página de editar valoraciones', () => {
    const userRating = {
      id: 1,
      movie: movie.tconst,
      user: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
      overall_score: 9,
      soundtrack: 9,
      acting: 9,
      cinematography: 9,
      plot: 9,
      comment: 'Mi valoración',
    }

    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    cy.intercept('GET', `**/movies/ratings/${movie.tconst}/`, {
      statusCode: 200,
      body: userRating,
    }).as('getUserRating')

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [],
    }).as('getRatings')

    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit(`/movie/${movie.tconst}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getMovie')
    cy.wait('@getUserRating')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // Debe mostrar el botón "Change rating"
    cy.contains('Change rating').should('be.visible')
    cy.contains('Change rating').click()

    // Debe redirigir a la página de editar valoraciones
    cy.url().should('include', `/movie/${movie.tconst}/rate`)
  })

  it('muestra el botón para eliminar la valoración en los detalles de la película', () => {
    const userRating = {
      id: 1,
      movie: movie.tconst,
      user: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
      overall_score: 9,
      soundtrack: 9,
      acting: 9,
      cinematography: 9,
      plot: 9,
      comment: 'Mi valoración',
    }

    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    cy.intercept('GET', `**/movies/ratings/${movie.tconst}/`, {
      statusCode: 200,
      body: userRating,
    }).as('getUserRating')

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [],
    }).as('getRatings')

    cy.intercept('DELETE', `**/movies/ratings/${movie.tconst}/`, {
      statusCode: 200,
      body: {},
    }).as('deleteRating')

    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit(`/movie/${movie.tconst}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getMovie')
    cy.wait('@getUserRating')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // Debe mostrar el botón "Delete rating"
    cy.contains('Delete rating').should('be.visible')
  })

  it('muestra el botón para eliminar solo el comentario cuando hay comentario', () => {
    const userRating = {
      id: 1,
      movie: movie.tconst,
      user: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
      overall_score: 9,
      soundtrack: 9,
      acting: 9,
      cinematography: 9,
      plot: 9,
      comment: 'Mi comentario',
    }

    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    cy.intercept('GET', `**/movies/ratings/${movie.tconst}/`, {
      statusCode: 200,
      body: userRating,
    }).as('getUserRating')

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [],
    }).as('getRatings')

    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit(`/movie/${movie.tconst}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getMovie')
    cy.wait('@getUserRating')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // Debe mostrar el botón "Delete comment"
    cy.contains('Delete comment').should('be.visible')
  })

  it('muestra el botón de Like en la parte superior del comentario', () => {
    const comment = {
      id: 1,
      text: 'Excelente película',
      username: 'user1',
      user_photo: '/media/profile_photos/user_1.jpg',
      parent_id: null,
      like_count: 5,
      reply_count: 2,
      is_liked: false,
      created_at: '2024-01-01T00:00:00Z',
    }

    const rating = {
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
      comment: 'Excelente película',
    }

    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [comment],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [rating],
    }).as('getRatings')

    cy.visit(`/movie/${movie.tconst}`)

    cy.wait('@getMovie')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // Debe mostrar el botón de Like
    cy.get('.like-button').should('be.visible')
    cy.get('.like-button').should('contain', '5') // like_count
  })

  it('muestra el Like remarcado si el usuario ya ha votado', () => {
    const comment = {
      id: 1,
      text: 'Excelente película',
      username: 'user1',
      user_photo: '/media/profile_photos/user_1.jpg',
      parent_id: null,
      like_count: 5,
      reply_count: 2,
      is_liked: true, // El usuario ya ha dado like
      created_at: '2024-01-01T00:00:00Z',
    }

    const rating = {
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
      comment: 'Excelente película',
    }

    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [comment],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [rating],
    }).as('getRatings')

    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit(`/movie/${movie.tconst}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getMovie')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // El botón de Like debe tener la clase "liked"
    cy.get('.like-button').should('have.class', 'liked')
  })

  it('permite eliminar el Like dando clic en la votación remarcada', () => {
    const comment = {
      id: 1,
      text: 'Excelente película',
      username: 'user1',
      user_photo: '/media/profile_photos/user_1.jpg',
      parent_id: null,
      like_count: 5,
      reply_count: 2,
      is_liked: true,
      created_at: '2024-01-01T00:00:00Z',
    }

    const rating = {
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
      comment: 'Excelente película',
    }

    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [comment],
    }).as('getComments')

    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [rating],
    }).as('getRatings')

    // Mock para cuando se elimina el like
    cy.intercept('POST', `**/movies/comments/1/like/`, {
      statusCode: 200,
      body: {
        liked: false,
        like_count: 4,
      },
    }).as('toggleLike')

    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit(`/movie/${movie.tconst}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getMovie')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // Hacer clic en el botón de Like (que está remarcado)
    cy.get('.like-button.liked').click()

    cy.wait('@toggleLike')

    // El contador debe disminuir
    cy.get('.like-button').should('contain', '4')
  })
})

