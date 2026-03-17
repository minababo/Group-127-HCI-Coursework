import { useEffect, useMemo, useRef, useState } from "react";
import AppTopNav from "./AppTopNav";
import "./RoomDesignerPage.css";

const FEET_TO_METERS = 0.3048;
const DEFAULT_ROOM_WIDTH_FT = 16;
const DEFAULT_ROOM_LENGTH_FT = 12;

const LIBRARY_SECTIONS = [
  {
    title: "Seating",
    items: [
      {
        code: "CH",
        type: "Chair",
        name: "Eames Chair",
        widthFt: 2.4,
        heightFt: 2.4,
        color: "#4F46E5",
      },
      {
        code: "SF",
        type: "Sofa",
        name: "Leather Sofa",
        widthFt: 7.2,
        heightFt: 3.2,
        color: "#4F46E5",
      },
    ],
  },
  {
    title: "Tables & Surfaces",
    items: [
      {
        code: "DT",
        type: "Table",
        name: "Dining Table",
        widthFt: 6.0,
        heightFt: 3.5,
        color: "#475569",
      },
      {
        code: "CT",
        type: "Table",
        name: "Coffee Table",
        widthFt: 3.2,
        heightFt: 3.2,
        color: "#64748B",
      },
      {
        code: "OD",
        type: "Desk",
        name: "Office Desk",
        widthFt: 5.0,
        heightFt: 2.5,
        color: "#8A3B1B",
      },
      {
        code: "ST",
        type: "Table",
        name: "Side Table",
        widthFt: 1.5,
        heightFt: 1.5,
        color: "#0F172A",
      },
    ],
  },
  {
    title: "Bedroom",
    items: [
      {
        code: "KB",
        type: "Bed",
        name: "King Bed",
        widthFt: 6.6,
        heightFt: 7.0,
        color: "#3B82F6",
      },
      {
        code: "NS",
        type: "Storage",
        name: "Nightstand",
        widthFt: 1.8,
        heightFt: 1.8,
        color: "#6366F1",
      },
    ],
  },
  {
    title: "Lighting",
    items: [
      {
        code: "FL",
        type: "Lamp",
        name: "Floor Lamp",
        widthFt: 1.0,
        heightFt: 1.0,
        color: "#10B981",
      },
    ],
  },
];

const FURNITURE_TYPES = [
  "Chair",
  "Table",
  "Sofa",
  "Desk",
  "Bed",
  "Lamp",
  "Storage",
];

const FINISH_SWATCHES = [
  "#4F46E5",
  "#4B5563",
  "#334155",
  "#0F172A",
  "#EA580C",
  "#EF4444",
  "#EAB308",
  "#10B981",
  "#3B82F6",
  "#6366F1",
];

let nextFurnitureId = 1;

function getUnit(roomSetup) {
  return roomSetup?.unit === "m" ? "m" : "ft";
}

function formatShape(shape) {
  if (shape === "l-shape") {
    return "L-Shaped Room";
  }

  return "Rectangle / Square";
}

function roundToTwo(value) {
  return Math.round(value * 100) / 100;
}

function formatValue(value, fallback = "--") {
  if (value === undefined || value === null || Number.isNaN(Number(value))) {
    return fallback;
  }

  const rounded = roundToTwo(Number(value));
  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(/\.?0+$/, "");
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toUnitValue(feetValue, unit) {
  if (unit === "m") {
    return roundToTwo(feetValue * FEET_TO_METERS);
  }

  return roundToTwo(feetValue);
}

function getRoomDimensions(roomSetup, unit) {
  const roomWidth = Number(roomSetup?.width);
  const roomLength = Number(roomSetup?.length);

  return {
    width:
      Number.isFinite(roomWidth) && roomWidth > 0
        ? roomWidth
        : toUnitValue(DEFAULT_ROOM_WIDTH_FT, unit),
    length:
      Number.isFinite(roomLength) && roomLength > 0
        ? roomLength
        : toUnitValue(DEFAULT_ROOM_LENGTH_FT, unit),
  };
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

function createFurnitureItem(template, index, unit) {
  const left = 8 + (index % 4) * 18;
  const top = 8 + (Math.floor(index / 4) % 4) * 16;

  return {
    id: `item-${nextFurnitureId++}`,
    type: template.type,
    name: template.name,
    width: toUnitValue(template.widthFt, unit),
    height: toUnitValue(template.heightFt, unit),
    rotation: 0,
    color: template.color,
    x: clamp(left, 6, 84),
    y: clamp(top, 6, 84),
  };
}

function toCanvasPercent(itemSize, roomSize, minPercent, maxPercent) {
  if (
    !Number.isFinite(itemSize) ||
    itemSize <= 0 ||
    !Number.isFinite(roomSize) ||
    roomSize <= 0
  ) {
    return minPercent;
  }

  return clamp((itemSize / roomSize) * 100, minPercent, maxPercent);
}

function getItemSizeLabel(width, height, unit) {
  return `${formatValue(width, "0")}${unit} x ${formatValue(height, "0")}${unit}`;
}

function hexToRgba(hexColor, alpha) {
  const normalized = hexColor.replace("#", "");
  const expanded =
    normalized.length === 3
      ? normalized
          .split("")
          .map((char) => char + char)
          .join("")
      : normalized;

  if (!/^[0-9a-fA-F]{6}$/.test(expanded)) {
    return `rgba(79, 70, 229, ${alpha})`;
  }

  const red = parseInt(expanded.slice(0, 2), 16);
  const green = parseInt(expanded.slice(2, 4), 16);
  const blue = parseInt(expanded.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function sanitizeColor(value, fallback) {
  if (/^#[0-9A-Fa-f]{6}$/.test(value)) {
    return value.toUpperCase();
  }

  return fallback;
}

function coercePositiveNumber(rawValue, fallback) {
  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    return fallback;
  }

  return roundToTwo(parsedValue);
}

function coerceRotation(rawValue, fallback) {
  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return clamp(Math.round(parsedValue), 0, 360);
}

function FurnitureLibraryPanel({ searchTerm, unit, onSearchChange, onAddItem }) {
  const filteredSections = useMemo(() => {
    const normalizedTerm = searchTerm.trim().toLowerCase();

    if (!normalizedTerm) {
      return LIBRARY_SECTIONS;
    }

    return LIBRARY_SECTIONS.map((section) => {
      const items = section.items.filter((item) => {
        const haystack = `${item.name} ${item.type}`.toLowerCase();
        return haystack.includes(normalizedTerm);
      });

      return {
        ...section,
        items,
      };
    }).filter((section) => section.items.length > 0);
  }, [searchTerm]);

  return (
    <aside className="library-panel">
      <div className="library-header">
        <div className="library-title-row">
          <h2>Library</h2>
          <span className="library-count">128 items</span>
        </div>
      </div>

      <div className="library-search">
        <input
          type="text"
          placeholder="Search furniture..."
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="library-content">
        {filteredSections.length === 0 ? (
          <p className="library-empty">No furniture matches your search.</p>
        ) : null}

        {filteredSections.map((section) => (
          <section key={section.title} className="library-section">
            <div className="library-section-title">
              <h3>{section.title}</h3>
              <span>v</span>
            </div>

            <div className="library-item-grid">
              {section.items.map((item) => (
                <button
                  key={item.name}
                  type="button"
                  className="library-item-card"
                  onClick={() => onAddItem(item)}
                >
                  <div className="library-item-icon">{item.code}</div>
                  <h4>{item.name}</h4>
                  <p>{getItemSizeLabel(toUnitValue(item.widthFt, unit), toUnitValue(item.heightFt, unit), unit)}</p>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>

      <div className="library-footer">
        <p>Click items to place them on the canvas.</p>
        <button type="button">+ Custom Item</button>
      </div>
    </aside>
  );
}

function WorkspaceToolbar({ unit }) {
  return (
    <div className="workspace-toolbar-shell">
      <div className="workspace-toolbar">
        <button type="button" className="tool-icon-button" aria-label="Undo">
          U
        </button>
        <button type="button" className="tool-icon-button" aria-label="Redo">
          R
        </button>

        <div className="tool-divider" />

        <button type="button" className="tool-icon-button" aria-label="Zoom out">
          -
        </button>
        <span className="tool-zoom-value">100%</span>
        <button type="button" className="tool-icon-button" aria-label="Zoom in">
          +
        </button>
        <button type="button" className="tool-icon-button" aria-label="Fit to screen">
          Fit
        </button>

        <div className="tool-divider" />

        <div className="tool-unit-toggle" aria-label="Unit display">
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

function RoomCanvas({
  roomSetup,
  unit,
  placedItems,
  selectedItemId,
  onSelectItem,
  onDeselectItem,
  onMoveItem,
}) {
  const roomOutlineRef = useRef(null);
  const [dragState, setDragState] = useState(null);
  const shapeLabel = formatShape(roomSetup?.shape);
  const rulerMarks = getRulerMarks(unit);
  const roomDimensions = getRoomDimensions(roomSetup, unit);

  useEffect(() => {
    if (!dragState) {
      return undefined;
    }

    const handleMouseMove = (event) => {
      const outlineElement = roomOutlineRef.current;
      if (!outlineElement) {
        return;
      }

      const draggedItem = placedItems.find((item) => item.id === dragState.itemId);
      if (!draggedItem) {
        setDragState(null);
        return;
      }

      const rect = outlineElement.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) {
        return;
      }

      const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
      const pointerY = ((event.clientY - rect.top) / rect.height) * 100;
      const blockWidth = toCanvasPercent(
        draggedItem.width,
        roomDimensions.width,
        9,
        44,
      );
      const blockHeight = toCanvasPercent(
        draggedItem.height,
        roomDimensions.length,
        9,
        40,
      );
      const nextX = clamp(pointerX - dragState.offsetX, 0, 100 - blockWidth);
      const nextY = clamp(pointerY - dragState.offsetY, 0, 100 - blockHeight);

      onMoveItem(dragState.itemId, nextX, nextY);
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [
    dragState,
    onMoveItem,
    placedItems,
    roomDimensions.length,
    roomDimensions.width,
  ]);

  const handleCanvasMouseDown = (event) => {
    if (event.target !== event.currentTarget) {
      return;
    }

    onDeselectItem();
  };

  const handleItemMouseDown = (event, item) => {
    event.preventDefault();
    event.stopPropagation();
    onSelectItem(item.id);

    const outlineElement = roomOutlineRef.current;
    if (!outlineElement) {
      return;
    }

    const rect = outlineElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return;
    }

    const pointerX = ((event.clientX - rect.left) / rect.width) * 100;
    const pointerY = ((event.clientY - rect.top) / rect.height) * 100;

    setDragState({
      itemId: item.id,
      offsetX: pointerX - item.x,
      offsetY: pointerY - item.y,
    });
  };

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
          <div
            ref={roomOutlineRef}
            className={`room-outline ${dragState ? "is-dragging" : ""}`}
            onMouseDown={handleCanvasMouseDown}
            role="presentation"
          >
            <div className="room-shape-label">{shapeLabel}</div>

            {placedItems.length === 0 ? (
              <div className="canvas-empty-state">
                Add furniture from the library to start your layout.
              </div>
            ) : null}

            {placedItems.map((item) => {
              const isSelected = item.id === selectedItemId;
              const blockWidth = toCanvasPercent(item.width, roomDimensions.width, 9, 44);
              const blockHeight = toCanvasPercent(item.height, roomDimensions.length, 9, 40);

              return (
                <button
                  key={item.id}
                  type="button"
                  className={`furniture-block ${isSelected ? "selected" : ""} ${
                    dragState?.itemId === item.id ? "dragging" : ""
                  }`}
                  style={{
                    left: `${item.x}%`,
                    top: `${item.y}%`,
                    width: `${blockWidth}%`,
                    height: `${blockHeight}%`,
                    transform: `rotate(${item.rotation}deg)`,
                    borderColor: item.color,
                    backgroundColor: hexToRgba(item.color, isSelected ? 0.18 : 0.1),
                  }}
                  onMouseDown={(event) => handleItemMouseDown(event, item)}
                  onClick={(event) => {
                    event.stopPropagation();
                  }}
                  onDragStart={(event) => event.preventDefault()}
                >
                  <span>{item.name.toUpperCase()}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="workspace-hud-row">
        <div className="workspace-chip-group">
          <span className="workspace-chip chip-success">Autosaved just now</span>
          <span className="workspace-chip">
            {formatValue(roomDimensions.length)}{unit} x {formatValue(roomDimensions.width)}{unit} Room
          </span>
        </div>

        <div className="workspace-hint">
          Click and drag canvas items to reposition them.
        </div>
      </div>
    </section>
  );
}

function PropertiesPanel({
  unit,
  selectedItem,
  hasItems,
  onUpdateSelectedItem,
  onRemoveSelectedItem,
  onClearItems,
  onDeselectItem,
  onBackToSetup,
}) {
  return (
    <aside className="properties-panel">
      <div className="properties-header">
        <h2>Properties</h2>
        {selectedItem ? (
          <button type="button" onClick={onDeselectItem}>
            Deselect
          </button>
        ) : null}
      </div>

      {!selectedItem ? (
        <div className="properties-empty-state">
          <h3>No furniture selected</h3>
          <p>
            Select an item from the room canvas to edit type, size, rotation,
            and finish.
          </p>
        </div>
      ) : (
        <>
          <div className="properties-item">
            <span className="properties-pill">Furniture Item</span>
            <h3>{selectedItem.name}</h3>
            <p>
              {selectedItem.type} placeholder in {formatValue(selectedItem.width)}{unit} x{" "}
              {formatValue(selectedItem.height)}{unit}
            </p>
          </div>

          <section className="properties-section">
            <h4>Item Details</h4>

            <div className="properties-two-col">
              <label className="properties-field" htmlFor="furniture-type-select">
                Type
                <select
                  id="furniture-type-select"
                  value={selectedItem.type}
                  onChange={(event) =>
                    onUpdateSelectedItem("type", event.target.value)
                  }
                >
                  {FURNITURE_TYPES.map((typeOption) => (
                    <option key={typeOption} value={typeOption}>
                      {typeOption}
                    </option>
                  ))}
                </select>
              </label>

              <label className="properties-field" htmlFor="furniture-name-input">
                Name
                <input
                  id="furniture-name-input"
                  type="text"
                  value={selectedItem.name}
                  onChange={(event) =>
                    onUpdateSelectedItem("name", event.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section className="properties-section">
            <h4>Dimensions</h4>

            <div className="properties-two-col">
              <label className="properties-field" htmlFor="furniture-width-input">
                Width ({unit})
                <input
                  id="furniture-width-input"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formatValue(selectedItem.width, "")}
                  onChange={(event) =>
                    onUpdateSelectedItem("width", event.target.value)
                  }
                />
              </label>

              <label className="properties-field" htmlFor="furniture-height-input">
                Height ({unit})
                <input
                  id="furniture-height-input"
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={formatValue(selectedItem.height, "")}
                  onChange={(event) =>
                    onUpdateSelectedItem("height", event.target.value)
                  }
                />
              </label>
            </div>
          </section>

          <section className="properties-section">
            <h4>Rotation</h4>

            <div className="rotation-row">
              <input
                type="range"
                min="0"
                max="360"
                value={selectedItem.rotation}
                onChange={(event) =>
                  onUpdateSelectedItem("rotation", event.target.value)
                }
              />
              <span>{selectedItem.rotation}deg</span>
            </div>
          </section>

          <section className="properties-section">
            <h4>Finish & Material</h4>
            <p className="properties-subtitle">Upholstery color</p>

            <div className="swatch-row">
              {FINISH_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className={`swatch ${selectedItem.color === swatch ? "active" : ""}`}
                  style={{ backgroundColor: swatch }}
                  onClick={() => onUpdateSelectedItem("color", swatch)}
                />
              ))}
            </div>

            <label className="properties-field properties-color-field" htmlFor="furniture-color-input">
              Custom color
              <input
                id="furniture-color-input"
                type="color"
                value={selectedItem.color}
                onChange={(event) =>
                  onUpdateSelectedItem("color", event.target.value)
                }
              />
            </label>
          </section>
        </>
      )}

      <div className="properties-actions">
        <button
          type="button"
          className="action-danger"
          onClick={onRemoveSelectedItem}
          disabled={!selectedItem}
        >
          Remove From Layout
        </button>
        <button
          type="button"
          className="action-secondary"
          onClick={onClearItems}
          disabled={!hasItems}
        >
          Clear All Items
        </button>
        <button type="button" className="action-primary" onClick={onBackToSetup}>
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
  const [searchTerm, setSearchTerm] = useState("");
  const [placedItems, setPlacedItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);

  const selectedItem = useMemo(() => {
    return placedItems.find((item) => item.id === selectedItemId) ?? null;
  }, [placedItems, selectedItemId]);

  const handleAddItem = (template) => {
    const nextItem = createFurnitureItem(template, placedItems.length, unit);
    setPlacedItems((previousItems) => [...previousItems, nextItem]);
    setSelectedItemId(nextItem.id);
  };

  const handleUpdateSelectedItem = (field, rawValue) => {
    if (!selectedItemId) {
      return;
    }

    setPlacedItems((previousItems) =>
      previousItems.map((item) => {
        if (item.id !== selectedItemId) {
          return item;
        }

        if (field === "name") {
          const nextName = rawValue.slice(0, 40).trim();
          return {
            ...item,
            name: nextName || item.type,
          };
        }

        if (field === "type") {
          return {
            ...item,
            type: rawValue,
          };
        }

        if (field === "width") {
          return {
            ...item,
            width: coercePositiveNumber(rawValue, item.width),
          };
        }

        if (field === "height") {
          return {
            ...item,
            height: coercePositiveNumber(rawValue, item.height),
          };
        }

        if (field === "rotation") {
          return {
            ...item,
            rotation: coerceRotation(rawValue, item.rotation),
          };
        }

        if (field === "color") {
          return {
            ...item,
            color: sanitizeColor(rawValue, item.color),
          };
        }

        return item;
      }),
    );
  };

  const handleRemoveSelectedItem = () => {
    if (!selectedItemId) {
      return;
    }

    setPlacedItems((previousItems) =>
      previousItems.filter((item) => item.id !== selectedItemId),
    );
    setSelectedItemId(null);
  };

  const handleClearItems = () => {
    setPlacedItems([]);
    setSelectedItemId(null);
  };

  const handleMoveItem = (itemId, nextX, nextY) => {
    setPlacedItems((previousItems) =>
      previousItems.map((item) =>
        item.id === itemId
          ? {
              ...item,
              x: roundToTwo(nextX),
              y: roundToTwo(nextY),
            }
          : item,
      ),
    );
  };

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
          <FurnitureLibraryPanel
            searchTerm={searchTerm}
            unit={unit}
            onSearchChange={setSearchTerm}
            onAddItem={handleAddItem}
          />

          <RoomCanvas
            roomSetup={roomSetup}
            unit={unit}
            placedItems={placedItems}
            selectedItemId={selectedItemId}
            onSelectItem={setSelectedItemId}
            onDeselectItem={() => setSelectedItemId(null)}
            onMoveItem={handleMoveItem}
          />

          <PropertiesPanel
            unit={unit}
            selectedItem={selectedItem}
            hasItems={placedItems.length > 0}
            onUpdateSelectedItem={handleUpdateSelectedItem}
            onRemoveSelectedItem={handleRemoveSelectedItem}
            onClearItems={handleClearItems}
            onDeselectItem={() => setSelectedItemId(null)}
            onBackToSetup={onBackToSetup}
          />
        </section>

        <footer className="designer-footer">
          <span>(c) 2026 FurnitureViz. All rights reserved.</span>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </footer>
      </main>

      <div className="workspace-toast">
        <span>Furniture placement shell active</span>
        <button type="button">Undo</button>
      </div>
    </div>
  );
}

export default RoomDesignerPage;
