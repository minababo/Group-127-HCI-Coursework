import AppTopNav from './AppTopNav'
import './RoomDesignerPage.css'

function formatShape(shape) {
  if (shape === 'l-shape') {
    return 'L-Shaped Room'
  }

  if (shape === 'rectangle') {
    return 'Rectangle / Square'
  }

  return 'Not selected'
}

function getSetupUnit(roomSetup) {
  return roomSetup?.unit === "m" ? "m" : "ft";
}

function RoomDesignerPage({
  username,
  roomSetup,
  onGoDashboard,
  onCreateDesign,
  onSavedDesigns,
  onBackToSetup,
}) {
  const unit = getSetupUnit(roomSetup);

  return (
    <div className="room-designer-page">
      <AppTopNav
        username={username}
        activeTab="create"
        onDashboard={onGoDashboard}
        onCreateDesign={onCreateDesign}
        onSavedDesigns={onSavedDesigns}
      />

      <main className="room-designer-main">
        <header className="room-designer-header">
          <div>
            <h1>Room Designer Workspace</h1>
            <p>
              Basic workspace placeholder entry screen. Furniture editing and live canvas logic
              will be added in a later milestone.
            </p>
          </div>

          <button type="button" onClick={onBackToSetup}>
            Back to Room Setup
          </button>
        </header>

        <section className="workspace-shell">
          <aside className="workspace-panel workspace-library">
            <h2>Furniture Library</h2>
            <input type="text" value="Search items..." readOnly />
            <ul>
              <li>Seating</li>
              <li>Tables & Surfaces</li>
              <li>Bedroom</li>
              <li>Lighting</li>
            </ul>
          </aside>

          <section className="workspace-center">
            <div className="workspace-toolbar">
              <button type="button">Grid</button>
              <button type="button">Snap</button>
              <button type="button">Save Design</button>
            </div>

            <div className="workspace-canvas">
              <div className="canvas-card">
                <h3>2D Canvas Placeholder</h3>
                <p>
                  This is a non-functional shell for now. Room drawing and furniture placement
                  tools will be implemented later.
                </p>

                <div className="setup-summary-row">
                  <span>{formatShape(roomSetup?.shape)}</span>
                  <span>
                    {roomSetup?.length ?? '--'}{unit} x {roomSetup?.width ?? '--'}{unit}
                  </span>
                  <span
                    className="wall-colour-preview"
                    style={{ backgroundColor: roomSetup?.wallColor ?? '#ffffff' }}
                  >
                    Wall
                  </span>
                </div>
              </div>
            </div>
          </section>

          <aside className="workspace-panel workspace-properties">
            <h2>Properties</h2>
            <div className="property-group">
              <p>Room Shape</p>
              <strong>{formatShape(roomSetup?.shape)}</strong>
            </div>
            <div className="property-group">
              <p>Length</p>
              <strong>{roomSetup?.length ?? '--'} {unit}</strong>
            </div>
            <div className="property-group">
              <p>Width</p>
              <strong>{roomSetup?.width ?? '--'} {unit}</strong>
            </div>
            <div className="property-group">
              <p>Wall Color</p>
              <div
                className="property-colour-chip"
                style={{ backgroundColor: roomSetup?.wallColor ?? '#ffffff' }}
              />
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}

export default RoomDesignerPage
