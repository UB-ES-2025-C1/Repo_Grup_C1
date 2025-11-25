// cypress/e2e/login.cy.js

describe('Login - autenticación de usuario', () => {
  it('muestra la cabecera y el formulario de login', () => {
    // Visitamos la página de login (usa baseUrl de cypress.config.js)
    cy.visit('/login')

    // Cabecera
    cy.contains('CINEMA UB').should('be.visible')
    cy.contains('← Home').should('be.visible')

    // Campos del formulario
    cy.get('input[placeholder="Email"]').should('be.visible')
    cy.get('input[placeholder="Password"]').should('be.visible')

    // Botón de envío
    cy.contains('button', 'Log in').should('be.visible')
  })

  it('realiza login correcto, guarda el token y redirige a Home', () => {
    // Interceptamos la llamada de login y devolvemos un token "fake"
    cy.intercept('POST', '**/movies/login/', {
      statusCode: 200,
      body: {
        access: 'fake-access-token',
      },
    }).as('loginRequest')

    // Visitamos la vista de login
    cy.visit('/login')

    // Rellenamos el formulario
    cy.get('input[placeholder="Email"]').type('user@example.com')
    cy.get('input[placeholder="Password"]').type('password123')

    // Enviamos el formulario
    cy.contains('button', 'Log in').click()

    // Esperamos a que se haga la petición de login
    cy.wait('@loginRequest')

    // Comprobamos que se ha guardado el token en localStorage
    cy.window().then((win) => {
      const token = win.localStorage.getItem('access')
      expect(token).to.eq('fake-access-token')
    })

    // Y que hemos sido redirigidos a la Home
    cy.url().should('include', '/')
    // Por ejemplo, vemos el catálogo
    cy.contains('CINEMA UB').should('be.visible')
  })

  it('no redirige ni guarda token cuando las credenciales son incorrectas', () => {
    // Simulamos un error 401 del backend
    cy.intercept('POST', '**/movies/login/', {
      statusCode: 401,
      body: {
        detail: 'No active account found with the given credentials',
      },
    }).as('loginError')

    // Visitamos la vista de login
    cy.visit('/login')

    // Rellenamos con credenciales incorrectas
    cy.get('input[placeholder="Email"]').type('wrong@example.com')
    cy.get('input[placeholder="Password"]').type('wrongpass')

    // Enviamos el formulario
    cy.contains('button', 'Log in').click()

    // Esperamos a la respuesta de error
    cy.wait('@loginError')

    // Comprobamos que seguimos en /login
    cy.url().should('include', '/login')

    // Y que NO se ha guardado ningún token
    cy.window().then((win) => {
      const token = win.localStorage.getItem('access')
      expect(token).to.be.oneOf([null, undefined])
    })

    // Opcional: si tu vista muestra algún mensaje de error, aquí lo podrías comprobar.
    // Ajusta el texto al que realmente uses en LoginView.vue.
    // cy.contains(/error/i).should('be.visible')
  }),
  it('flujo completo: desde Home va a Login, se autentica y vuelve a Home', () => {
    // Mock de login correcto
    cy.intercept('POST', '**/movies/login/', {
      statusCode: 200,
      body: {
        access: 'fake-access-token-flujo',
      },
    }).as('loginRequest')

    // (Opcional) Mockear películas para que Home tenga contenido
    cy.intercept('GET', '**/movies/', {
      statusCode: 200,
      body: [],
    }).as('getMovies')

    // 1) El usuario entra en la Home
    cy.visit('/')

    // Esperamos a la carga inicial de pelis (aunque el body sea [])
    cy.wait('@getMovies')

    // 2) Ve el botón "Log in" y hace clic
    cy.contains('button', 'Log in').click()

    // 3) Ahora está en /login
    cy.url().should('include', '/login')

    // 4) Rellena el formulario y envía
    cy.get('input[placeholder="Email"]').type('user@example.com')
    cy.get('input[placeholder="Password"]').type('password123')
    cy.contains('button', 'Log in').click()

    // 5) Esperamos a que se complete la petición de login
    cy.wait('@loginRequest')

    // 6) Se guarda el token en localStorage
    cy.window().then((win) => {
      const token = win.localStorage.getItem('access')
      expect(token).to.eq('fake-access-token-flujo')
    })

    // 7) Y el usuario vuelve a la Home
    cy.url().should('include', '/')
    cy.contains('CINEMA UB').should('be.visible')
  })
})
