import { useEffect, useState } from 'react'
import CreateRoomPage from './components/CreateRoomPage'
import DashboardPage from './components/DashboardPage'
import LoginPage from './components/LoginPage'
import RoomDesignerPage from './components/RoomDesignerPage'
import './styles/app.css'

const LOGIN_ROUTE = '/login'
const DASHBOARD_ROUTE = '/dashboard'
const CREATE_ROOM_ROUTE = '/create-room'
const ROOM_DESIGNER_ROUTE = '/room-designer'

function normalizeRoute(pathname) {
  if (
    pathname === LOGIN_ROUTE ||
    pathname === DASHBOARD_ROUTE ||
    pathname === CREATE_ROOM_ROUTE ||
    pathname === ROOM_DESIGNER_ROUTE
  ) {
    return pathname
  }

  return LOGIN_ROUTE
}

function App() {
  const [route, setRoute] = useState(() => normalizeRoute(window.location.pathname))
  const [currentUser, setCurrentUser] = useState(null)
  const [roomSetup, setRoomSetup] = useState(null)

  useEffect(() => {
    const normalizedRoute = normalizeRoute(window.location.pathname)
    if (normalizedRoute !== window.location.pathname) {
      window.history.replaceState({}, '', normalizedRoute)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const nextRoute = normalizeRoute(window.location.pathname)

      if (!currentUser && nextRoute !== LOGIN_ROUTE) {
        window.history.replaceState({}, '', LOGIN_ROUTE)
        setRoute(LOGIN_ROUTE)
        return
      }

      setRoute(nextRoute)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [currentUser])

  useEffect(() => {
    if (!currentUser && route !== LOGIN_ROUTE) {
      window.history.replaceState({}, '', LOGIN_ROUTE)
    }
  }, [currentUser, route])

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

  const handleDashboardNavigate = () => {
    navigate(DASHBOARD_ROUTE)
  }

  const handleCreateDesignNavigate = () => {
    navigate(CREATE_ROOM_ROUTE)
  }

  const handleRoomDesignerNavigate = (setupValues) => {
    setRoomSetup(setupValues)
    navigate(ROOM_DESIGNER_ROUTE)
  }

  const handleBackToSetup = () => {
    navigate(CREATE_ROOM_ROUTE)
  }

  const handleSavedDesignsPlaceholder = () => {}

  const handleLogout = () => {
    setCurrentUser(null)
    navigate(LOGIN_ROUTE, true)
  }

  if (!currentUser || route === LOGIN_ROUTE) {
    return <LoginPage onLogin={handleLogin} />
  }

  if (route === CREATE_ROOM_ROUTE) {
    return (
      <CreateRoomPage
        username={currentUser}
        onLogout={handleLogout}
        onGoDashboard={handleDashboardNavigate}
        onCreateDesign={handleCreateDesignNavigate}
        onSavedDesigns={handleSavedDesignsPlaceholder}
        onCancel={handleDashboardNavigate}
        onCreateRoom={handleRoomDesignerNavigate}
        initialSetup={roomSetup}
      />
    )
  }

  if (route === ROOM_DESIGNER_ROUTE) {
    return (
      <RoomDesignerPage
        username={currentUser}
        roomSetup={roomSetup}
        onGoDashboard={handleDashboardNavigate}
        onCreateDesign={handleCreateDesignNavigate}
        onSavedDesigns={handleSavedDesignsPlaceholder}
        onBackToSetup={handleBackToSetup}
      />
    )
  }

  return (
    <DashboardPage
      username={currentUser}
      onLogout={handleLogout}
      onCreateDesign={handleCreateDesignNavigate}
      onGoDashboard={handleDashboardNavigate}
      onSavedDesigns={handleSavedDesignsPlaceholder}
    />
  )
}

export default App
