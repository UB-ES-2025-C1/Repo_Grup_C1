// cypress/e2e/register.cy.js

describe('Register - flujo de registro de usuario', () => {
  beforeEach(() => {
    // Nos aseguramos de que no haya sesión previa
    cy.clearLocalStorage()
  })

  it('muestra el formulario de registro con los campos necesarios', () => {
    cy.visit('/register')

    // Cabecera / marca
    cy.contains('CINEMA UB').should('be.visible')
    cy.contains('Sign up').should('be.visible')

    // Campos del formulario
    cy.get('input[placeholder="Name"]').should('be.visible')
    cy.get('input[placeholder="Email"]').should('be.visible')
    cy.get('input[placeholder="Password"]').should('be.visible')
    cy.get('input[placeholder="Confirm Password"]').should('be.visible')

    // Botón de submit
    cy.contains('button', 'Create account').should('be.visible')
  })

  it('realiza un registro correcto y redirige a /login', () => {
    // Interceptamos la petición POST al backend de registro
    cy.intercept('POST', '**/movies/register/', {
      statusCode: 201,
      body: {
        username: 'testuser',
        email: 'test@example.com'
      }
    }).as('registerRequest')

    cy.visit('/register')

    const username = 'testuser'
    const email = 'test@example.com'
    const password = 'Password123!'

    // Rellenamos el formulario COMPLETO (incluida confirmación)
    cy.get('input[placeholder="Name"]').type(username)
    cy.get('input[placeholder="Email"]').type(email)
    cy.get('input[placeholder="Password"]').type(password)
    cy.get('input[placeholder="Confirm Password"]').type(password)

    // Enviamos el formulario
    cy.contains('button', 'Create account').click()

    // Esperamos a que la petición se haga realmente
    cy.wait('@registerRequest').its('request.body').should((body) => {
      expect(body.username).to.equal(username)
      expect(body.email).to.equal(email)
      expect(body.password).to.equal(password)
    })

    // Y finalmente debería redirigir a /login
    cy.url().should('include', '/login')
  })

  it('muestra errores cuando el backend devuelve error de validación', () => {
    // Simulamos error del backend (por ejemplo, email ya registrado)
    cy.intercept('POST', '**/movies/register/', {
      statusCode: 400,
      body: {
        email: ['This email is already taken.']
      }
    }).as('registerError')

    cy.visit('/register')

    const username = 'testuser2'
    const email = 'duplicate@example.com'
    const password = 'Password123!'

    // Rellenamos el formulario COMPLETO
    cy.get('input[placeholder="Name"]').type(username)
    cy.get('input[placeholder="Email"]').type(email)
    cy.get('input[placeholder="Password"]').type(password)
    cy.get('input[placeholder="Confirm Password"]').type(password)

    cy.contains('button', 'Create account').click()

    // Esperamos a la respuesta con error
    cy.wait('@registerError')

    // El loader ya no debería estar
    cy.contains('Creating account...').should('not.exist')

    // Mensaje genérico de error
    cy.contains('Error creating your account').should('be.visible')

    // Error concreto del backend
    cy.contains('This email is already taken.').should('be.visible')
  })

  it('muestra un error si las contraseñas no coinciden y NO hace petición al backend', () => {
    // Espiamos la ruta, pero no esperamos que se llame
    const spy = cy.intercept('POST', '**/movies/register/').as('registerMismatch')

    cy.visit('/register')

    const password = 'Password123!'
    const otherPassword = 'Password456!'

    cy.get('input[placeholder="Name"]').type('mismatchUser')
    cy.get('input[placeholder="Email"]').type('mismatch@example.com')
    cy.get('input[placeholder="Password"]').type(password)
    cy.get('input[placeholder="Confirm Password"]').type(otherPassword)

    cy.contains('button', 'Create account').click()

    // Debe mostrarse el error de contraseñas que no coinciden (texto del componente)
    cy.contains('Les contrasenyes no coincideixen.').should('be.visible')

    // Y NO debería haberse hecho ninguna llamada al backend
    cy.get('@registerMismatch.all').should('have.length', 0)
  })
})
