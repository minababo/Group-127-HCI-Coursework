import { useState } from 'react'
import './LoginPage.css'

const ACCOUNTS = {
  admin: 'admin123',
  user: 'user123',
}

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

function EyeIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 2.64c1.56 0 3.083.463 4.379 1.33 1.214.813 2.177 1.947 2.783 3.273l.116.268.009.022a1.31 1.31 0 0 1 .036.932l-.036.114-.009.022c-.594 1.442-1.603 2.674-2.899 3.541-1.214.813-2.63 1.27-4.086 1.324L8 13.36c-1.56 0-3.083-.463-4.379-1.33-1.215-.813-2.177-1.947-2.783-3.273L.722 8.49.713 8.466a1.31 1.31 0 0 1 0-.932l.009-.022C1.316 6.07 2.325 4.838 3.621 3.97A7.889 7.889 0 0 1 8 2.64Zm0 1.34A6.54 6.54 0 0 0 4.366 5.084C3.298 5.799 2.465 6.813 1.97 8c.495 1.186 1.328 2.2 2.396 2.916A6.54 6.54 0 0 0 8 12.02l.242-.005a6.54 6.54 0 0 0 3.391-1.1A6.584 6.584 0 0 0 14.03 8a6.58 6.58 0 0 0-2.397-2.916A6.543 6.543 0 0 0 8 3.98Z"
      />
      <path
        fill="currentColor"
        d="M9.34 8A1.34 1.34 0 1 0 6.66 8a1.34 1.34 0 0 0 2.68 0Zm1.34 0a2.68 2.68 0 1 1-5.36 0 2.68 2.68 0 0 1 5.36 0Z"
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
    const trimmedIdentifier = identifier.trim().toLowerCase()
    const username = trimmedIdentifier.includes('@')
      ? trimmedIdentifier.split('@')[0]
      : trimmedIdentifier

    if (ACCOUNTS[username] && ACCOUNTS[username] === password) {
      setError('')
      onLogin(username)
      return
    }

    setError(
      'Invalid credentials. Use admin/admin123 or user/user123 for this demo.'
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

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="field-row">
              <label htmlFor="identifier">Work Email</label>
              <input
                id="identifier"
                type="text"
                placeholder="designer@furnitureviz.com"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                required
              />
            </div>

            <div className="field-row">
              <div className="password-heading">
                <label htmlFor="password">Password</label>
                <button type="button" className="link-button">
                  Forgot password?
                </button>
              </div>

              <div className="password-input-wrap">
                <input
                  id="password"
                  type="password"
                  placeholder="password123"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button type="button" className="icon-button" aria-label="Show password">
                  <EyeIcon />
                </button>
              </div>
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
            <span>Don&apos;t have an account?</span>
            <a href="#">Contact administrator</a>
          </div>
        </section>
      </main>

      <footer className="login-footer">
        <a href="#">Help Center</a>
        <a href="#">Privacy Policy</a>
        <a href="#">Terms of Service</a>
      </footer>
    </div>
  )
}

export default LoginPage
