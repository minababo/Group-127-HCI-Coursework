import './DashboardPage.css'

function DashboardPage({ username, onLogout }) {
  const displayName = username === 'admin' ? 'Admin' : 'User'

  return (
    <div className="dashboard-page">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="dashboard-brand">
            <span className="dashboard-brand-icon">FV</span>
            <span>FurnitureViz</span>
          </div>

          <nav className="dashboard-nav">
            <button type="button" className="nav-item nav-item-active">
              Dashboard
            </button>
            <button type="button" className="nav-item">
              Create Design
            </button>
            <button type="button" className="nav-item">
              Saved Designs
            </button>
          </nav>

          <button type="button" className="logout-button" onClick={onLogout}>
            Sign Out
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <section className="welcome-section">
          <h1>Good Morning, {displayName}</h1>
          <p>Ready to transform spaces today? This is your dashboard placeholder.</p>
        </section>

        <section className="action-section">
          <button type="button" className="primary-action">
            Create New Design
          </button>
          <button type="button" className="secondary-action">
            Saved Designs
          </button>
        </section>

        <section className="placeholder-panel">
          <h2>Dashboard Content Coming Soon</h2>
          <p>
            Recent projects, statistics, and design previews will be added in a
            later milestone.
          </p>
        </section>
      </main>
    </div>
  )
}

export default DashboardPage
