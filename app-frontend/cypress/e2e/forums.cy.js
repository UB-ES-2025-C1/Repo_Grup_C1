// cypress/e2e/forums.cy.js

describe('Forums - funcionalidad de foros', () => {
  const forums = [
    {
      id: 1,
      title: 'Forum de Películas de Acción',
      description: 'Discute sobre tus películas de acción favoritas',
      creator_username: 'user1',
      created_at: '2024-01-01T00:00:00Z',
      posts_count: 5,
    },
    {
      id: 2,
      title: 'Forum de Ciencia Ficción',
      description: 'Todo sobre ciencia ficción',
      creator_username: 'user2',
      created_at: '2024-01-02T00:00:00Z',
      posts_count: 3,
    },
  ]

  const forumPosts = [
    {
      id: 1,
      text: 'Primer post en el foro',
      user: {
        username: 'user1',
        photo: '/media/profile_photos/user_1.jpg',
      },
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 2,
      text: 'Segundo post',
      user: {
        username: 'user2',
        photo: '/media/profile_photos/user_2.jpg',
      },
      created_at: '2024-01-01T01:00:00Z',
    },
  ]

  it('muestra el botón Forums en el header al lado de CINEMA UB', () => {
    cy.visit('/')

    cy.contains('CINEMA UB').should('be.visible')
    cy.contains('Forums').should('be.visible')
    cy.get('a[href="/forums"]').should('exist')
  })

  it('redirige a login cuando un usuario no registrado hace clic en Forums', () => {
    // No hay token en localStorage
    cy.visit('/')

    cy.contains('Forums').click()

    // Debe redirigir a login
    cy.url().should('include', '/login')
  })

  it('redirige a la página de Forums cuando un usuario registrado hace clic en Forums', () => {
    // Mock de foros
    cy.intercept('GET', '**/movies/forums/', {
      statusCode: 200,
      body: forums,
    }).as('getForums')

    // Mock del perfil del usuario
    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    // Configurar localStorage ANTES de visitar
    cy.window().then((win) => {
      win.localStorage.setItem('access', 'fake-token')
      win.localStorage.setItem('username', 'testuser')
    })

    cy.visit('/')

    // Esperar a que la página se cargue completamente
    cy.contains('CINEMA UB').should('be.visible')
    
    // Ahora hacer clic en Forums
    cy.contains('Forums').click()

    cy.url().should('include', '/forums')
    cy.wait('@getForums')
    cy.contains('Forums').should('be.visible')
  })

  it('muestra el botón CREATE FORUM en la página de foros', () => {
    // Mock de foros
    cy.intercept('GET', '**/movies/forums/', {
      statusCode: 200,
      body: forums,
    }).as('getForums')

    // Mock del perfil del usuario
    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit('/forums', {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getForums')
    cy.contains('+ Create Forum').should('be.visible')
  })

  it('abre el modal de creación de foro al hacer clic en CREATE FORUM', () => {
    // Mock de foros
    cy.intercept('GET', '**/movies/forums/', {
      statusCode: 200,
      body: forums,
    }).as('getForums')

    // Mock del perfil del usuario
    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit('/forums', {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getForums')
    
    // Hacer clic en el botón
    cy.contains('+ Create Forum').click()

    // Debe aparecer el modal
    cy.contains('Create Forum').should('be.visible')
    cy.get('input[type="text"]').should('be.visible')
    cy.get('textarea').should('be.visible')
    cy.contains('Cancel').should('be.visible')
    cy.contains('Create').should('be.visible')
  })

  it('abre el chat del foro cuando se hace clic en el título de un foro', () => {
    const forumId = 1
    const forum = forums[0]

    // Mock del foro específico
    cy.intercept('GET', `**/movies/forums/${forumId}/`, {
      statusCode: 200,
      body: forum,
    }).as('getForum')

    // Mock de los posts del foro
    cy.intercept('GET', `**/movies/forums/${forumId}/posts/`, {
      statusCode: 200,
      body: forumPosts,
    }).as('getForumPosts')

    // Mock del perfil del usuario
    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    // Mock de foros para la lista inicial
    cy.intercept('GET', '**/movies/forums/', {
      statusCode: 200,
      body: forums,
    }).as('getForums')

    cy.visit('/forums', {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getForums')

    // Hacer clic en el título del foro (el ForumCard hace clic en toda la card)
    cy.contains(forum.title).click()

    // Debe redirigir al chat del foro
    cy.url().should('include', `/forums/${forumId}`)
    cy.wait('@getForum')
    cy.wait('@getForumPosts')
    cy.contains(forum.title).should('be.visible')
  })

  it('muestra los posts en el chat del foro', () => {
    const forumId = 1
    const forum = forums[0]

    // Mock del foro específico
    cy.intercept('GET', `**/movies/forums/${forumId}/`, {
      statusCode: 200,
      body: forum,
    }).as('getForum')

    // Mock de los posts del foro
    cy.intercept('GET', `**/movies/forums/${forumId}/posts/`, {
      statusCode: 200,
      body: forumPosts,
    }).as('getForumPosts')

    // Mock del perfil del usuario
    cy.intercept('GET', '**/movies/profiles/me/', {
      statusCode: 200,
      body: {
        username: 'testuser',
        photo: '/media/profile_photos/user_1.jpg',
      },
    }).as('getProfile')

    cy.visit(`/forums/${forumId}`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('access', 'fake-token')
        win.localStorage.setItem('username', 'testuser')
      },
    })

    cy.wait('@getForum')
    cy.wait('@getForumPosts')

    // Verificar que se muestran los posts
    cy.contains(forumPosts[0].text).should('be.visible')
    cy.contains(forumPosts[1].text).should('be.visible')
  })
})

