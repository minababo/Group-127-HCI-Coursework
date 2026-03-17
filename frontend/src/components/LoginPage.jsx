import { useState } from 'react'
import { validateAccountCredentials } from '../utils/account'
import './LoginPage.css'

function FurnitureLogoIcon() {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13 1.122c.567 0 1.123.15 1.615.433l7.56 4.32.004.003.18.112a3.654 3.654 0 0 1 1.185 1.073c.284.492.434 1.05.434 1.618v8.642c0 .568-.15 1.126-.434 1.618a3.636 3.636 0 0 1-1.185 1.184l-.004.003-7.56 4.32A3.258 3.258 0 0 1 13 24.878c-.567 0-1.124-.149-1.616-.432l-7.56-4.32-.004-.003a3.64 3.64 0 0 1-1.185-1.184A3.253 3.253 0 0 1 2.2 17.32V8.68l.007-.213c.033-.494.179-.975.427-1.405A3.636 3.636 0 0 1 3.82 5.877l.004-.003 7.56-4.32A3.259 3.259 0 0 1 13 1.122Zm0 2.16a1.08 1.08 0 0 0-.54.144l-.004.003-7.556 4.316.001.001a1.081 1.081 0 0 0-.395.395c-.095.164-.145.35-.145.54v8.638l.01.141c.018.14.063.275.134.398.094.163.229.298.391.393l7.56 4.32.004.002.127.063A1.368 1.368 0 0 0 13 22.718c.19 0 .376-.05.54-.145l.004-.002 7.56-4.32a1.09 1.09 0 0 0 .39-.393c.095-.163.145-.349.146-.538V8.681l-.01-.141a1.082 1.082 0 0 0-.134-.398 1.076 1.076 0 0 0-.395-.395l-7.556-4.318-.004-.002A1.08 1.08 0 0 0 13 3.282Z"
      />
      <path
        fill="currentColor"
        d="M21.957 6.604a1.08 1.08 0 0 1 1.375.449 1.08 1.08 0 0 1-.397 1.474l-9.397 5.4a1.08 1.08 0 0 1-1.076 0l-9.396-5.4-.093-.06a1.08 1.08 0 0 1-.306-1.415 1.08 1.08 0 0 1 1.376-.448l.098.05L13 11.743l8.858-5.09.099-.05Z"
      />
      <path
        fill="currentColor"
        d="M11.92 23.82V13.02a1.08 1.08 0 1 1 2.16 0v10.8a1.08 1.08 0 0 1-2.16 0Z"
      />
    </svg>
  )
}

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.69 7.33a.67.67 0 1 1 0 1.34H3.31a.67.67 0 1 1 0-1.34h9.38Zm-4.179-4.494a.67.67 0 0 1 .947 0l4.69 4.69a.67.67 0 0 1 0 .948l-4.69 4.69a.67.67 0 0 1-.947-.948L12.727 8 8.511 3.784a.67.67 0 0 1 0-.948Z"
      />
    </svg>
  )
}

function LoginPage({ onLogin }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (event) => {
    event.preventDefault()
    const account = validateAccountCredentials(identifier, password)

    if (account) {
      setError('')
      onLogin(account.username)
      return
    }

    setError(
      'Incorrect username or password. Use the demo credentials below.'
    )
  }

  return (
    <div className="login-page">
      <main className="login-main">
        <section className="login-card">
          <div className="logo-box">
            <FurnitureLogoIcon />
          </div>
          <h1 className="brand-title">FurnitureViz</h1>
          <h2 className="login-title">Sign in to FurnitureViz</h2>
          <p className="subtitle">
            Enter your credentials to access your workspace
          </p>
          <p className="demo-credentials">
            Demo sign-in: <strong>admin / admin123</strong> or{" "}
            <strong>user / user123</strong>
          </p>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field-row">
              <label htmlFor="identifier">Username or Email</label>
              <input
                id="identifier"
                type="text"
                placeholder="admin or admin@furnitureviz.com"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </div>

            <div className="field-row">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="password123"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>

            {error ? <p className="error-message">{error}</p> : null}

            <label className="remember-row">
              <input type="checkbox" className="custom-checkbox" />
              <span>Remember me for 30 days</span>
            </label>

            <button className="sign-in-button" type="submit">
              <span>Sign In</span>
              <ArrowRightIcon />
            </button>
          </form>

          <div className="login-meta">
            <span>Need access? Contact your course administrator.</span>
          </div>
        </section>
      </main>

      <footer className="login-footer">
        <span>Help Center</span>
        <span>Privacy Policy</span>
        <span>Terms of Service</span>
      </footer>
    </div>
  )
}

export default LoginPage
