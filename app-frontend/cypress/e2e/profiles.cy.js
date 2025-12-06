// cypress/e2e/profiles.cy.js

describe('Profiles - funcionalidad de perfiles de usuario', () => {
  const users = [
    {
      username: 'alice',
      photo: '/media/profile_photos/user_1.jpg',
    },
    {
      username: 'bob',
      photo: '/media/profile_photos/user_2.jpg',
    },
    {
      username: 'charlie',
      photo: null,
    },
  ]

  const movies = [
    {
      tconst: 'tt0120737',
      primaryTitle: 'The Lord of the Rings',
      startYear: 2001,
      average_rating: 8.8,
      poster_path: '/media/posters/tt0120737.png',
    },
    {
      tconst: 'tt0111161',
      primaryTitle: 'The Shawshank Redemption',
      startYear: 1994,
      average_rating: 9.3,
      poster_path: '/media/posters/tt0111161.png',
    },
  ]

  const userProfile = {
    username: 'testuser',
    photo: '/media/profile_photos/user_1.jpg',
    bio: 'Esta es mi biografía de prueba',
    average_rating: 8.5,
  }

  const userRatings = [
    {
      id: 1,
      movie: 'tt0120737',
      movie_info: {
        tconst: 'tt0120737',
        primary_title: 'The Lord of the Rings',
        start_year: 2001,
        poster_path: '/media/posters/tt0120737.png',
      },
      overall_score: 9,
      comment: 'Excelente película',
      date: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      movie: 'tt0111161',
      movie_info: {
        tconst: 'tt0111161',
        primary_title: 'The Shawshank Redemption',
        start_year: 1994,
        poster_path: '/media/posters/tt0111161.png',
      },
      overall_score: 10,
      comment: 'Una obra maestra',
      date: '2024-01-02T00:00:00Z',
    },
  ]

  it('muestra la barra de búsqueda para filtrar usuarios', () => {
    cy.intercept('GET', '**/movies/', {
      statusCode: 200,
      body: movies,
    }).as('getMovies')

    cy.intercept('GET', '**/api/users/', {
      statusCode: 200,
      body: users,
    }).as('getUsers')

    cy.visit('/')

    cy.wait('@getMovies')
    cy.wait('@getUsers')

    cy.get('.search-input').should('be.visible')
    cy.get('.search-input').should('have.attr', 'placeholder', 'Search movies or users...')
  })

  it('muestra usuarios con foto y nombre cuando se busca', () => {
    cy.intercept('GET', '**/movies/', {
      statusCode: 200,
      body: movies,
    }).as('getMovies')

    cy.intercept('GET', '**/api/users/', {
      statusCode: 200,
      body: users,
    }).as('getUsers')

    cy.visit('/')

    cy.wait('@getMovies')
    cy.wait('@getUsers')

    // Buscar un usuario
    cy.get('.search-input').type('alice')

    // Debe aparecer la sección de usuarios
    cy.contains('Users').should('be.visible')
    cy.contains('alice').should('be.visible')
  })

  it('muestra usuarios en orden alfabético', () => {
    cy.intercept('GET', '**/movies/', {
      statusCode: 200,
      body: movies,
    }).as('getMovies')

    cy.intercept('GET', '**/api/users/', {
      statusCode: 200,
      body: users,
    }).as('getUsers')

    cy.visit('/')

    cy.wait('@getMovies')
    cy.wait('@getUsers')

    // Buscar algo que coincida con varios usuarios
    cy.get('.search-input').type('a')

    // Verificar que aparecen en orden alfabético
    cy.contains('Users').should('be.visible')
    // alice, bob, charlie deberían estar en orden
    cy.get('.grid').contains('alice').should('exist')
  })

  it('muestra apartados separados para películas y usuarios cuando hay coincidencias en ambos', () => {
    // Crear usuarios y películas que coincidan con la búsqueda
    const searchQuery = 'The'
    const matchingMovies = movies.filter(m => m.primaryTitle.includes(searchQuery))
    const matchingUsers = [
      {
        username: 'TheUser',
        photo: '/media/profile_photos/user_1.jpg',
      },
      ...users,
    ]

    cy.intercept('GET', '**/movies/', {
      statusCode: 200,
      body: movies,
    }).as('getMovies')

    cy.intercept('GET', '**/api/users/', {
      statusCode: 200,
      body: matchingUsers,
    }).as('getUsers')

    cy.visit('/')

    cy.wait('@getMovies')
    cy.wait('@getUsers')

    // Buscar algo que coincida con películas y usuarios
    cy.get('.search-input').type('The')

    // Debe aparecer la sección de películas
    cy.contains('Movies').should('be.visible')
    // Debe aparecer la sección de usuarios si hay coincidencias
    cy.contains('Users').should('be.visible')
  })

  it('no muestra el apartado de usuarios si no hay coincidencias', () => {
    cy.intercept('GET', '**/movies/', {
      statusCode: 200,
      body: movies,
    }).as('getMovies')

    cy.intercept('GET', '**/api/users/', {
      statusCode: 200,
      body: users,
    }).as('getUsers')

    cy.visit('/')

    cy.wait('@getMovies')
    cy.wait('@getUsers')

    // Buscar algo que no coincida con ningún usuario
    cy.get('.search-input').type('xyz123nonexistent')

    // No debe aparecer la sección de usuarios
    cy.contains('Users').should('not.exist')
  })

  it('redirige al perfil cuando se hace clic en el nombre o foto de un usuario en un comentario', () => {
    const movie = {
      ...movies[0],
      description: 'A great movie',
      numVotes: 123456,
      average_rating: 8.8,
      average_soundtrack: 8.5,
      average_acting: 9.0,
      average_cinematography: 8.7,
      average_plot: 8.9,
    }
    
    // El componente MovieInfo combina comments y ratings
    // Necesitamos mockear ambos endpoints
    const comment = {
      id: 1,
      text: 'Gran película',
      username: 'alice',
      user_photo: '/media/profile_photos/user_1.jpg',
      parent_id: null,
      like_count: 0,
      is_liked: false,
      reply_count: 0,
    }
    
    const rating = {
      id: 1,
      movie: movie.tconst,
      user: {
        username: 'alice',
        photo: '/media/profile_photos/user_1.jpg',
      },
      overall_score: 9,
      soundtrack: 9,
      acting: 9,
      cinematography: 9,
      plot: 9,
      comment: 'Gran película',
    }

    // Mock de la película
    cy.intercept('GET', `**/movies/${movie.tconst}/`, {
      statusCode: 200,
      body: movie,
    }).as('getMovie')

    // Mock de comments (endpoint que usa MovieInfo)
    cy.intercept('GET', `**/movies/${movie.tconst}/comments/`, {
      statusCode: 200,
      body: [comment],
    }).as('getComments')

    // Mock de ratings (endpoint que usa MovieInfo)
    cy.intercept('GET', `**/movies/${movie.tconst}/ratings/`, {
      statusCode: 200,
      body: [rating],
    }).as('getRatings')

    // Mock del perfil del usuario alice
    cy.intercept('GET', '**/movies/profiles/alice/', {
      statusCode: 200,
      body: {
        username: 'alice',
        photo: '/media/profile_photos/user_1.jpg',
        bio: 'Biografía de alice',
        average_rating: 8.5,
      },
    }).as('getUserProfile')

    // Mock de ratings del usuario alice
    cy.intercept('GET', '**/movies/profiles/alice/ratings/', {
      statusCode: 200,
      body: [],
    }).as('getUserRatings')

    cy.visit(`/movie/${movie.tconst}`)

    cy.wait('@getMovie')
    cy.wait('@getComments')
    cy.wait('@getRatings')

    // Esperar a que se rendericen los comentarios
    cy.contains('Other reviews').should('be.visible')
    
    // Hacer clic en el nombre del usuario en el comentario
    cy.contains('alice').click()

    // Debe redirigir al perfil
    cy.url().should('include', '/profile/alice')
    cy.wait('@getUserProfile')
    cy.wait('@getUserRatings')
    cy.contains('alice').should('be.visible')
  })

  it('redirige al perfil cuando se hace clic en un UserCard en el buscador', () => {
    cy.intercept('GET', '**/movies/', {
      statusCode: 200,
      body: movies,
    }).as('getMovies')

    cy.intercept('GET', '**/api/users/', {
      statusCode: 200,
      body: users,
    }).as('getUsers')

    // Mock del perfil del usuario
    cy.intercept('GET', '**/movies/profiles/alice/', {
      statusCode: 200,
      body: {
        username: 'alice',
        photo: '/media/profile_photos/user_1.jpg',
        bio: 'Biografía de alice',
        average_rating: 8.5,
      },
    }).as('getUserProfile')

    // Mock de ratings del usuario alice
    cy.intercept('GET', '**/movies/profiles/alice/ratings/', {
      statusCode: 200,
      body: [],
    }).as('getUserRatings')

    cy.visit('/')

    cy.wait('@getMovies')
    cy.wait('@getUsers')

    // Buscar y hacer clic en un usuario
    cy.get('.search-input').type('alice')
    cy.contains('alice').click()

    // Debe redirigir al perfil
    cy.url().should('include', '/profile/alice')
    cy.wait('@getUserProfile')
    cy.wait('@getUserRatings')
    cy.contains('alice').should('be.visible')
  })

  it('muestra el botón para actualizar la fotografía de perfil en el perfil propio', () => {
    // Mock del perfil del usuario (se llama dos veces: una para el header y otra para el perfil)
    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
        bio: userProfile.bio,
        average_rating: userProfile.average_rating,
      },
    }).as('getMyProfile')

    cy.intercept('GET', '**/movies/profiles/testuser/ratings/', {
      statusCode: 200,
      body: userRatings,
    }).as('getMyRatings')

    cy.visit('/profile', {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    // Esperar a que se carguen los datos (puede haber múltiples llamadas)
    cy.wait('@getMyProfile')
    cy.wait('@getMyRatings')

    // Debe mostrar el botón de editar perfil
    cy.get('#edit-profile-btn').should('be.visible')
    cy.get('#edit-profile-btn').click()

    // Debe mostrar opciones para actualizar foto y biografía
    cy.contains('Bio').should('be.visible')
    // El input de archivo para la foto debería estar presente (aunque sea oculto)
    cy.get('input[type="file"]').should('exist')
    cy.get('#photo-selector-btn').should('be.visible')
  })

  it('muestra el botón para actualizar la biografía de perfil', () => {
    // Mock del perfil del usuario (se llama dos veces: una para el header y otra para el perfil)
    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
        bio: userProfile.bio,
        average_rating: userProfile.average_rating,
      },
    }).as('getMyProfile')

    cy.intercept('GET', '**/movies/profiles/testuser/ratings/', {
      statusCode: 200,
      body: userRatings,
    }).as('getMyRatings')

    cy.visit('/profile', {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    // Esperar a que se carguen los datos (puede haber múltiples llamadas)
    cy.wait('@getMyProfile')
    cy.wait('@getMyRatings')

    // Abrir el formulario de edición
    cy.get('#edit-profile-btn').click()

    // Debe mostrar el textarea para la biografía
    cy.get('#bio-text-area').should('be.visible')
    cy.get('#remove-bio-btn').should('be.visible')
  })

  it('muestra el botón con nombre y foto en el header para acceder al perfil propio', () => {
    // Configurar los mocks ANTES de visitar la página
    // Mock del perfil del usuario para el header (se llama cuando no hay datos en localStorage)
    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
        bio: userProfile.bio,
        average_rating: userProfile.average_rating,
      },
    }).as('getProfile')

    cy.intercept('GET', '**/movies/', {
      statusCode: 200,
      body: movies,
    }).as('getMovies')

    cy.intercept('GET', '**/api/users/', {
      statusCode: 200,
      body: users,
    }).as('getUsers')

    // Mock del perfil completo para cuando se accede al perfil
    cy.intercept('GET', '**/movies/profiles/testuser/ratings/', {
      statusCode: 200,
      body: userRatings,
    }).as('getMyRatings')

    // Limpiar localStorage para forzar que el header haga la petición
    cy.visit('/', {
      onBeforeLoad(win) {
        win.localStorage.clear()
        win.localStorage.setItem('access', 'fake-token')
        // NO poner username ni avatarUrl para forzar la petición
      },
    })

    cy.wait('@getProfile')
    cy.wait('@getMovies')

    // Debe mostrar el botón con el nombre y foto del usuario
    cy.contains('testuser').should('be.visible')
    cy.get('.profile-btn').should('be.visible')
    cy.get('.profile-btn img.avatar').should('exist')

    // Hacer clic en el botón debe redirigir al perfil
    cy.get('.profile-btn').click()
    cy.url().should('include', '/profile')
  })

  it('muestra el perfil con username, foto, biografía y media de valoraciones', () => {
    // Mock del perfil del usuario
    cy.intercept('GET', '**/movies/profiles/testuser/', {
      statusCode: 200,
      body: userProfile,
    }).as('getUserProfile')

    cy.intercept('GET', '**/movies/profiles/testuser/ratings/', {
      statusCode: 200,
      body: userRatings,
    }).as('getUserRatings')

    cy.visit('/profile/testuser')

    cy.wait('@getUserProfile')
    cy.wait('@getUserRatings')

    // Verificar que se muestran todos los elementos
    cy.contains(userProfile.username).should('be.visible')
    cy.get('.avatar').should('exist')
    cy.contains(userProfile.bio).should('be.visible')
    cy.contains(`Rating average: ${userProfile.average_rating}`).should('be.visible')
  })

  it('muestra las últimas películas valoradas con comentarios y notas', () => {
    // Mock del perfil del usuario
    cy.intercept('GET', '**/movies/profiles/testuser/', {
      statusCode: 200,
      body: userProfile,
    }).as('getUserProfile')

    cy.intercept('GET', '**/movies/profiles/testuser/ratings/', {
      statusCode: 200,
      body: userRatings,
    }).as('getUserRatings')

    cy.visit('/profile/testuser')

    cy.wait('@getUserProfile')
    cy.wait('@getUserRatings')

    // Verificar que se muestran las películas valoradas
    cy.contains('Latest ratings').should('be.visible')
    cy.contains('The Lord of the Rings').should('be.visible')
    cy.contains('Excelente película').should('be.visible')
    // El RatingCard muestra el overall_score en un span con clase "value"
    cy.contains('Rating:').parent().contains('9').should('exist')

    cy.contains('The Shawshank Redemption').should('be.visible')
    cy.contains('Una obra maestra').should('be.visible')
    cy.contains('Rating:').parent().contains('10').should('exist')
  })

  it('muestra paginación cuando hay más de 6 valoraciones', () => {
    // Crear más de 6 valoraciones
    const manyRatings = []
    for (let i = 1; i <= 10; i++) {
      manyRatings.push({
        id: i,
        movie: `tt000000${i}`,
        movie_info: {
          tconst: `tt000000${i}`,
          primary_title: `Movie ${i}`,
          start_year: 2000 + i,
          poster_path: `/media/posters/tt000000${i}.png`,
        },
        overall_score: 8,
        comment: `Comment ${i}`,
        date: `2024-01-${String(i).padStart(2, '0')}T00:00:00Z`,
      })
    }

    // Mock del perfil del usuario
    cy.intercept('GET', '**/movies/profiles/testuser/', {
      statusCode: 200,
      body: userProfile,
    }).as('getUserProfile')

    cy.intercept('GET', '**/movies/profiles/testuser/ratings/', {
      statusCode: 200,
      body: manyRatings,
    }).as('getUserRatings')

    cy.visit('/profile/testuser')

    cy.wait('@getUserProfile')
    cy.wait('@getUserRatings')

    // Debe mostrar controles de paginación
    cy.get('.pagination').should('be.visible')
    cy.get('.pagination button').should('have.length.at.least', 3) // Prev, números, Next
  })
})

