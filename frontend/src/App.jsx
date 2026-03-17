import { Suspense, lazy, useEffect, useState } from 'react'
import CreateRoomPage from './components/CreateRoomPage'
import DashboardPage from './components/DashboardPage'
import LoginPage from './components/LoginPage'
import RoomDesignerPage from './components/RoomDesignerPage'
import { canCreateBlankDesigns, getAccountRole } from './utils/account'
import {
  deleteSavedDesign,
  getDesignPermissions,
  getSavedDesignById,
  loadSavedDesigns,
  mapDesignToRoomSetup,
  saveDesignSnapshot,
} from './utils/designStorage'
import './styles/app.css'

const Preview3DPage = lazy(() => import('./components/Preview3DPage'))

const LOGIN_ROUTE = '/login'
const DASHBOARD_ROUTE = '/dashboard'
const SAVED_DESIGNS_ROUTE = '/saved-designs'
const CREATE_ROOM_ROUTE = '/create-room'
const ROOM_DESIGNER_ROUTE = '/room-designer'
const PREVIEW_3D_ROUTE = '/preview-3d'

function normalizeRoute(pathname) {
  if (
    pathname === LOGIN_ROUTE ||
    pathname === DASHBOARD_ROUTE ||
    pathname === SAVED_DESIGNS_ROUTE ||
    pathname === CREATE_ROOM_ROUTE ||
    pathname === ROOM_DESIGNER_ROUTE ||
    pathname === PREVIEW_3D_ROUTE
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
  const [previewDesign, setPreviewDesign] = useState(null)
  const [savedDesigns, setSavedDesigns] = useState(() => loadSavedDesigns())
  const currentRole = currentUser ? getAccountRole(currentUser) : null
  const canCreateDesign = canCreateBlankDesigns(currentRole)

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

      if (currentUser && !canCreateDesign && nextRoute === CREATE_ROOM_ROUTE) {
        window.history.replaceState({}, '', DASHBOARD_ROUTE)
        setRoute(DASHBOARD_ROUTE)
        return
      }

      setRoute(nextRoute)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [canCreateDesign, currentUser])

  useEffect(() => {
    if (!currentUser && route !== LOGIN_ROUTE) {
      window.history.replaceState({}, '', LOGIN_ROUTE)
    }
  }, [currentUser, route])

  useEffect(() => {
    if (currentUser && !canCreateDesign && route === CREATE_ROOM_ROUTE) {
      window.history.replaceState({}, '', DASHBOARD_ROUTE)
      setRoute(DASHBOARD_ROUTE)
    }
  }, [canCreateDesign, currentUser, route])

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
    if (!canCreateDesign) {
      navigate(DASHBOARD_ROUTE, true)
      return
    }

    navigate(CREATE_ROOM_ROUTE)
  }

  const handleSavedDesignsNavigate = () => {
    navigate(SAVED_DESIGNS_ROUTE)
  }

  const handleRoomDesignerNavigate = (setupValues) => {
    setRoomSetup(setupValues)
    setLoadedDesign(null)
    setPreviewDesign(null)
    navigate(ROOM_DESIGNER_ROUTE)
  }

  const handleBackToSetup = () => {
    setPreviewDesign(null)
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
    setPreviewDesign(null)
    navigate(ROOM_DESIGNER_ROUTE)
  }

  const handleSaveDesign = (snapshot) => {
    const existingDesign = snapshot?.id ? getSavedDesignById(snapshot.id) : null
    const designPermissions = getDesignPermissions(existingDesign, {
      username: currentUser,
      role: currentRole,
    })
    const shouldSaveAsCopy = designPermissions.shouldSaveAsCopy
    const nextDesign = saveDesignSnapshot({
      ...snapshot,
      id: shouldSaveAsCopy ? null : snapshot?.id,
      owner: shouldSaveAsCopy
        ? currentUser
        : existingDesign?.owner ?? currentUser,
      role: shouldSaveAsCopy
        ? currentRole
        : existingDesign?.role ?? currentRole,
      isTemplate: shouldSaveAsCopy
        ? false
        : existingDesign?.isTemplate ?? currentRole === 'admin',
    })

    setSavedDesigns(loadSavedDesigns())
    setLoadedDesign(nextDesign)
    setRoomSetup(mapDesignToRoomSetup(nextDesign))

    return nextDesign
  }

  const handleDeleteDesign = (designId) => {
    const designToDelete = getSavedDesignById(designId)
    const designPermissions = getDesignPermissions(designToDelete, {
      username: currentUser,
      role: currentRole,
    })

    if (!designPermissions.canDelete) {
      return false
    }

    deleteSavedDesign(designId)
    setSavedDesigns(loadSavedDesigns())

    if (loadedDesign?.id === designId) {
      setLoadedDesign(null)
    }

    if (previewDesign?.id === designId) {
      setPreviewDesign(null)
    }

    return true
  }

  const handleOpenPreview = (designSnapshot) => {
    if (!designSnapshot?.room) {
      return
    }

    setPreviewDesign(designSnapshot)
    setRoomSetup(mapDesignToRoomSetup(designSnapshot))
    setLoadedDesign(designSnapshot)
    navigate(PREVIEW_3D_ROUTE)
  }

  const handleReturnToDesigner = () => {
    if (previewDesign?.room) {
      setRoomSetup(mapDesignToRoomSetup(previewDesign))
      setLoadedDesign(previewDesign)
    }

    navigate(ROOM_DESIGNER_ROUTE, true)
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
        canCreateDesign={canCreateDesign}
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
        onOpenPreview={handleOpenPreview}
        canCreateDesign={canCreateDesign}
      />
    )
  }

  if (route === PREVIEW_3D_ROUTE) {
    return (
      <Suspense fallback={<div className="app-loading-state">Loading 3D preview...</div>}>
        <Preview3DPage
          username={currentUser}
          design={previewDesign}
          onGoDashboard={handleDashboardNavigate}
          onCreateDesign={handleCreateDesignNavigate}
          onSavedDesigns={handleSavedDesignsNavigate}
          onBackToDesigner={handleReturnToDesigner}
          canCreateDesign={canCreateDesign}
        />
      </Suspense>
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
        onOpenPreview={handleOpenPreview}
        onDeleteDesign={handleDeleteDesign}
        canCreateDesign={canCreateDesign}
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
      onOpenPreview={handleOpenPreview}
      onDeleteDesign={handleDeleteDesign}
      canCreateDesign={canCreateDesign}
    />
  )
}

export default App
