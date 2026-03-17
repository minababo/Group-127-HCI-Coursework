import { useState } from 'react'
import AppTopNav from './AppTopNav'
import './CreateRoomPage.css'

const ROOM_SHAPES = ['Rectangle', 'Square', 'L-Shape']
const WALL_SWATCHES = ['#F3F4F6', '#E0E7FF', '#FDE68A', '#FCE7F3', '#D1FAE5']

function CreateRoomPage({
  username,
  onLogout,
  onGoDashboard,
  onCreateDesign,
  onSavedDesigns,
  onCancel,
  onCreateRoom,
}) {
  const [selectedShape, setSelectedShape] = useState('Rectangle')
  const [selectedWallColor, setSelectedWallColor] = useState('#F3F4F6')

  return (
    <div className="create-room-page">
      <AppTopNav
        username={username}
        activeTab="create"
        onDashboard={onGoDashboard}
        onCreateDesign={onCreateDesign}
        onSavedDesigns={onSavedDesigns}
        onLogout={onLogout}
      />

      <main className="create-room-main">
        <section className="create-room-hero">
          <h1>Create Room</h1>
          <p>Set up the room basics before opening the design workspace.</p>
        </section>

        <section className="room-shell">
          <div className="room-section">
            <h2>Room Shape</h2>
            <div className="shape-grid">
              {ROOM_SHAPES.map((shape) => (
                <button
                  key={shape}
                  type="button"
                  className={`shape-option ${
                    selectedShape === shape ? 'shape-option-active' : ''
                  }`}
                  onClick={() => setSelectedShape(shape)}
                >
                  {shape}
                </button>
              ))}
            </div>
          </div>

          <div className="room-section">
            <h2>Room Dimensions (meters)</h2>
            <div className="dimension-grid">
              <label>
                Width
                <input type="number" placeholder="5.0" />
              </label>
              <label>
                Length
                <input type="number" placeholder="7.0" />
              </label>
              <label>
                Height
                <input type="number" placeholder="3.0" />
              </label>
            </div>
          </div>

          <div className="room-section">
            <h2>Wall Colour</h2>
            <div className="colour-grid">
              {WALL_SWATCHES.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`colour-chip ${
                    selectedWallColor === color ? 'colour-chip-active' : ''
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => setSelectedWallColor(color)}
                  aria-label={`Select ${color} wall colour`}
                />
              ))}
            </div>
          </div>

          <div className="room-actions">
            <button type="button" className="action-secondary" onClick={onCancel}>
              Cancel
            </button>
            <button type="button" className="action-primary" onClick={onCreateRoom}>
              Create Room
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}

export default CreateRoomPage
