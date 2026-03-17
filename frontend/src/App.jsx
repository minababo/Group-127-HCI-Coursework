import { useEffect, useState } from 'react'
import DashboardPage from './components/DashboardPage'
import LoginPage from './components/LoginPage'
import './styles/app.css'

const LOGIN_ROUTE = '/login'
const DASHBOARD_ROUTE = '/dashboard'

function getInitialRoute() {
  return window.location.pathname === DASHBOARD_ROUTE
    ? DASHBOARD_ROUTE
    : LOGIN_ROUTE
}

function App() {
  const [route, setRoute] = useState(getInitialRoute)
  const [currentUser, setCurrentUser] = useState(null)

  useEffect(() => {
    if (window.location.pathname !== LOGIN_ROUTE) {
      window.history.replaceState({}, '', LOGIN_ROUTE)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      if (window.location.pathname === DASHBOARD_ROUTE && currentUser) {
        setRoute(DASHBOARD_ROUTE)
        return
      }
      setRoute(LOGIN_ROUTE)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentUser])

  const navigate = (nextRoute, replace = false) => {
    if (replace) {
      window.history.replaceState({}, '', nextRoute)
    } else {
      window.history.pushState({}, '', nextRoute)
    }
    setRoute(nextRoute)
  }

  const handleLogin = (username) => {
    setCurrentUser(username)
    navigate(DASHBOARD_ROUTE)
  }

  const handleLogout = () => {
    setCurrentUser(null)
    navigate(LOGIN_ROUTE, true)
  }

  if (route === DASHBOARD_ROUTE && currentUser) {
    return <DashboardPage username={currentUser} onLogout={handleLogout} />
  }

  return <LoginPage onLogin={handleLogin} />
}

export default App
