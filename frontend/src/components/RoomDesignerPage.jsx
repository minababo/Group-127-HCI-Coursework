import AppTopNav from "./AppTopNav";
import "./RoomDesignerPage.css";

const LIBRARY_SECTIONS = [
  {
    title: "Seating",
    items: [
      { code: "CH", name: "Eames Chair", size: "2.4' x 2.4'" },
      { code: "SF", name: "Leather Sofa", size: "7.2' x 3.2'" },
    ],
  },
  {
    title: "Tables & Surfaces",
    items: [
      { code: "DT", name: "Dining Table", size: "6.0' x 3.5'" },
      { code: "CT", name: "Coffee Table", size: "3.2' x 3.2'" },
      { code: "OD", name: "Office Desk", size: "5.0' x 2.5'" },
      { code: "ST", name: "Side Table", size: "1.5' x 1.5'" },
    ],
  },
  {
    title: "Bedroom",
    items: [
      { code: "KB", name: "King Bed", size: "6.6' x 7.0'" },
      { code: "NS", name: "Nightstand", size: "1.8' x 1.8'" },
    ],
  },
  {
    title: "Lighting",
    items: [{ code: "FL", name: "Floor Lamp", size: "1.0' x 1.0'" }],
  },
];

const FINISH_SWATCHES = [
  "#4F46E5",
  "#C4C4C4",
  "#E5E5E5",
  "#8A3B1B",
  "#111827",
];

function getUnit(roomSetup) {
  return roomSetup?.unit === "m" ? "m" : "ft";
}

function formatShape(shape) {
  if (shape === "l-shape") {
    return "L-Shaped Room";
  }

  if (shape === "rectangle") {
    return "Rectangle / Square";
  }

  return "Rectangle / Square";
}

function formatValue(value, fallback = "--") {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return fallback;
  }

  const rounded = Math.round(Number(value) * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(/\.?0+$/, "");
}

function getRulerMarks(unit) {
  if (unit === "m") {
    return ["0m", "2m", "4m", "6m", "8m", "10m", "12m", "14m", "16m"];
  }

  return [
    "0ft",
    "5ft",
    "10ft",
    "15ft",
    "20ft",
    "25ft",
    "30ft",
    "35ft",
    "40ft",
    "45ft",
    "50ft",
  ];
}

function FurnitureLibraryPanel() {
  return (
    <aside className="library-panel">
      <div className="library-header">
        <h2>Furniture Library</h2>
      </div>

      <div className="library-search">
        <input type="text" placeholder="Search items..." readOnly />
      </div>

      <div className="library-content">
        {LIBRARY_SECTIONS.map((section) => (
          <section key={section.title} className="library-section">
            <div className="library-section-title">
              <h3>{section.title}</h3>
              <span>⌄</span>
            </div>

            <div className="library-item-grid">
              {section.items.map((item) => (
                <article key={item.name} className="library-item-card">
                  <div className="library-item-icon">{item.code}</div>
                  <h4>{item.name}</h4>
                  <p>{item.size}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="library-footer">
        <p>Drag items to canvas to start</p>
        <button type="button">+ Custom Item</button>
      </div>
    </aside>
  );
}

function WorkspaceToolbar({ unit }) {
  return (
    <div className="workspace-toolbar-shell">
      <div className="workspace-toolbar">
        <button type="button" className="tool-icon-button">
          ↶
        </button>
        <button type="button" className="tool-icon-button">
          ↷
        </button>

        <div className="tool-divider" />

        <button type="button" className="tool-icon-button">
          -
        </button>
        <span className="tool-zoom-value">100%</span>
        <button type="button" className="tool-icon-button">
          +
        </button>
        <button type="button" className="tool-icon-button">
          ⤢
        </button>

        <div className="tool-divider" />

        <div className="tool-unit-toggle">
          <span className={unit === "ft" ? "active" : ""}>FT</span>
          <span className={unit === "m" ? "active" : ""}>M</span>
        </div>

        <button type="button" className="tool-pill">
          Grid
        </button>
        <button type="button" className="tool-pill">
          Snap
        </button>

        <button type="button" className="tool-save">
          Save Design
        </button>
      </div>
    </div>
  );
}

function WorkspaceCanvas({ roomSetup, unit }) {
  const shapeLabel = formatShape(roomSetup?.shape);
  const rulerMarks = getRulerMarks(unit);
  const width = formatValue(roomSetup?.width);
  const length = formatValue(roomSetup?.length);

  return (
    <section className="workspace-center-panel">
      <WorkspaceToolbar unit={unit} />

      <div className="workspace-ruler">
        {rulerMarks.map((mark) => (
          <span key={mark}>{mark}</span>
        ))}
      </div>

      <div className="workspace-canvas-shell">
        <div className="room-boundary">
          <div className="room-outline">
            <div className="room-shape-label">{shapeLabel}</div>

            <div className="selected-furniture">
              <span className="rotate-handle">↻</span>
              <strong>SECTIONAL SOFA</strong>
              <span className="handle corner-tl" />
              <span className="handle corner-tr" />
              <span className="handle corner-bl" />
              <span className="handle corner-br" />
            </div>

            <div className="area-rug">AREA RUG</div>
            <div className="table-block">TABLE</div>
          </div>
        </div>
      </div>

      <div className="workspace-hud-row">
        <div className="workspace-chip-group">
          <span className="workspace-chip chip-success">Autosaved just now</span>
          <span className="workspace-chip">
            {length}
            {unit} x {width}
            {unit} Room
          </span>
        </div>

        <div className="workspace-hint">
          Start designing by dragging items from library
        </div>
      </div>
    </section>
  );
}

function PropertiesPanel({ roomSetup, unit, onBackToSetup }) {
  const width = formatValue(roomSetup?.width, "7.2");
  const depth = formatValue(roomSetup?.length, "3.2");

  return (
    <aside className="properties-panel">
      <div className="properties-header">
        <h2>Properties</h2>
        <button type="button">Deselect</button>
      </div>

      <div className="properties-item">
        <span className="properties-pill">Furniture Item</span>
        <h3>Sectional Sofa</h3>
        <p>Standard Living Room Set • Fabric</p>
      </div>

      <section className="properties-section">
        <h4>Dimensions</h4>

        <div className="properties-input-grid">
          <label>
            Width ({unit})
            <input type="text" value={width} readOnly />
          </label>
          <label>
            Depth ({unit})
            <input type="text" value={depth} readOnly />
          </label>
        </div>

        <button type="button" className="properties-line-button">
          Lock Aspect Ratio
        </button>
      </section>

      <section className="properties-section">
        <h4>Position & Rotation</h4>

        <div className="rotation-row">
          <input type="range" min="0" max="360" value="0" readOnly />
          <span>0°</span>
        </div>

        <div className="properties-input-grid">
          <label>
            X Position
            <input type="text" value="40" readOnly />
          </label>
          <label>
            Y Position
            <input type="text" value="60" readOnly />
          </label>
        </div>
      </section>

      <section className="properties-section">
        <h4>Style</h4>
        <p className="properties-subtitle">Finish / Color</p>

        <div className="swatch-row">
          {FINISH_SWATCHES.map((swatch, index) => (
            <button
              key={swatch}
              type="button"
              className={`swatch ${index === 0 ? "active" : ""}`}
              style={{ backgroundColor: swatch }}
            />
          ))}
        </div>
      </section>

      <div className="properties-actions">
        <button type="button" className="action-primary">
          3D View Preview
        </button>
        <button type="button" className="action-secondary">
          Duplicate Item
        </button>
        <button type="button" className="action-exit" onClick={onBackToSetup}>
          Exit Workspace
        </button>
      </div>
    </aside>
  );
}

function RoomDesignerPage({
  username,
  roomSetup,
  onGoDashboard,
  onCreateDesign,
  onSavedDesigns,
  onBackToSetup,
}) {
  const unit = getUnit(roomSetup);

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
        <section className="designer-shell">
          <FurnitureLibraryPanel />
          <WorkspaceCanvas roomSetup={roomSetup} unit={unit} />
          <PropertiesPanel
            roomSetup={roomSetup}
            unit={unit}
            onBackToSetup={onBackToSetup}
          />
        </section>

        <footer className="designer-footer">
          <span>© 2026 FurnitureViz. All rights reserved.</span>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </footer>
      </main>

      <div className="workspace-toast">
        <span>Project saved successfully</span>
        <button type="button">Undo</button>
      </div>
    </div>
  );
}

export default RoomDesignerPage;
