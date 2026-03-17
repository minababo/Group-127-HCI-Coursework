import { useEffect, useState } from 'react'
import CreateRoomPage from './components/CreateRoomPage'
import DashboardPage from './components/DashboardPage'
import LoginPage from './components/LoginPage'
import RoomDesignerPage from './components/RoomDesignerPage'
import {
  deleteSavedDesign,
  getSavedDesignById,
  loadSavedDesigns,
  mapDesignToRoomSetup,
  saveDesignSnapshot,
} from './utils/designStorage'
import './styles/app.css'

const LOGIN_ROUTE = '/login'
const DASHBOARD_ROUTE = '/dashboard'
const SAVED_DESIGNS_ROUTE = '/saved-designs'
const CREATE_ROOM_ROUTE = '/create-room'
const ROOM_DESIGNER_ROUTE = '/room-designer'

function normalizeRoute(pathname) {
  if (
    pathname === LOGIN_ROUTE ||
    pathname === DASHBOARD_ROUTE ||
    pathname === SAVED_DESIGNS_ROUTE ||
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
  const [loadedDesign, setLoadedDesign] = useState(null)
  const [savedDesigns, setSavedDesigns] = useState(() => loadSavedDesigns())

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

  const handleSavedDesignsNavigate = () => {
    navigate(SAVED_DESIGNS_ROUTE)
  }

  const handleRoomDesignerNavigate = (setupValues) => {
    setRoomSetup(setupValues)
    setLoadedDesign(null)
    navigate(ROOM_DESIGNER_ROUTE)
  }

  const handleBackToSetup = () => {
    navigate(CREATE_ROOM_ROUTE)
  }

  const handleOpenSavedDesign = (designId) => {
    const nextDesign = getSavedDesignById(designId)

    if (!nextDesign) {
      setSavedDesigns(loadSavedDesigns())
      return
    }

    setRoomSetup(mapDesignToRoomSetup(nextDesign))
    setLoadedDesign(nextDesign)
    navigate(ROOM_DESIGNER_ROUTE)
  }

  const handleSaveDesign = (snapshot) => {
    const nextDesign = saveDesignSnapshot({
      ...snapshot,
      owner: currentUser,
    })

    setSavedDesigns(loadSavedDesigns())
    setLoadedDesign(nextDesign)
    setRoomSetup(mapDesignToRoomSetup(nextDesign))

    return nextDesign
  }

  const handleDeleteDesign = (designId) => {
    deleteSavedDesign(designId)
    setSavedDesigns(loadSavedDesigns())

    if (loadedDesign?.id === designId) {
      setLoadedDesign(null)
    }
  }

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
        onSavedDesigns={handleSavedDesignsNavigate}
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
        initialDesign={loadedDesign}
        onGoDashboard={handleDashboardNavigate}
        onCreateDesign={handleCreateDesignNavigate}
        onSavedDesigns={handleSavedDesignsNavigate}
        onSaveDesign={handleSaveDesign}
        onBackToSetup={handleBackToSetup}
      />
    )
  }

  if (route === SAVED_DESIGNS_ROUTE) {
    return (
      <DashboardPage
        username={currentUser}
        view="saved"
        savedDesigns={savedDesigns}
        onCreateDesign={handleCreateDesignNavigate}
        onGoDashboard={handleDashboardNavigate}
        onSavedDesigns={handleSavedDesignsNavigate}
        onOpenDesign={handleOpenSavedDesign}
        onDeleteDesign={handleDeleteDesign}
      />
    )
  }

  return (
    <DashboardPage
      username={currentUser}
      view="dashboard"
      savedDesigns={savedDesigns}
      onLogout={handleLogout}
      onCreateDesign={handleCreateDesignNavigate}
      onGoDashboard={handleDashboardNavigate}
      onSavedDesigns={handleSavedDesignsNavigate}
      onOpenDesign={handleOpenSavedDesign}
      onDeleteDesign={handleDeleteDesign}
    />
  )
}

export default App
