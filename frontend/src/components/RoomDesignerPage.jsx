import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppTopNav from "./AppTopNav";
import "./RoomDesignerPage.css";

const FEET_TO_METERS = 0.3048;
const DEFAULT_ROOM_WIDTH_FT = 16;
const DEFAULT_ROOM_LENGTH_FT = 12;
const MIN_FURNITURE_SIZE_FT = 1;
const ROOM_FRAME_PADDING_PX = 26;
const MAX_HISTORY_STEPS = 40;
const MIN_CANVAS_ZOOM = 0.7;
const MAX_CANVAS_ZOOM = 1.8;
const CANVAS_ZOOM_STEP = 0.1;
const KEYBOARD_NUDGE_FT = 0.25;

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

const RESIZE_HANDLES = [
  {
    direction: "top-left",
    className: "handle-top-left",
    ariaLabel: "Resize top left",
  },
  {
    direction: "top",
    className: "handle-top-center",
    ariaLabel: "Resize top",
  },
  {
    direction: "top-right",
    className: "handle-top-right",
    ariaLabel: "Resize top right",
  },
  {
    direction: "left",
    className: "handle-middle-left",
    ariaLabel: "Resize left",
  },
  {
    direction: "right",
    className: "handle-middle-right",
    ariaLabel: "Resize right",
  },
  {
    direction: "bottom-left",
    className: "handle-bottom-left",
    ariaLabel: "Resize bottom left",
  },
  {
    direction: "bottom",
    className: "handle-bottom-center",
    ariaLabel: "Resize bottom",
  },
  {
    direction: "bottom-right",
    className: "handle-bottom-right",
    ariaLabel: "Resize bottom right",
  },
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

function cloneItems(items) {
  return items.map((item) => ({ ...item }));
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

function getPositionBounds(size, containerSize = 100) {
  if (size <= containerSize) {
    return {
      min: 0,
      max: containerSize - size,
    };
  }

  return {
    min: containerSize - size,
    max: 0,
  };
}

function toUnitValue(feetValue, unit) {
  if (unit === "m") {
    return roundToTwo(feetValue * FEET_TO_METERS);
  }

  return roundToTwo(feetValue);
}

function toFeet(value, unit) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  if (unit === "m") {
    return value / FEET_TO_METERS;
  }

  return value;
}

function toPixels(value, pixelsPerFoot, unit) {
  return roundToTwo(toFeet(value, unit) * pixelsPerFoot);
}

function toCanvasUnits(pixelValue, pixelsPerFoot, unit) {
  if (
    !Number.isFinite(pixelValue) ||
    !Number.isFinite(pixelsPerFoot) ||
    pixelsPerFoot <= 0
  ) {
    return 0;
  }

  return roundToTwo(toUnitValue(pixelValue / pixelsPerFoot, unit));
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

function getRulerMarks(roomWidth, unit) {
  const safeWidth =
    Number.isFinite(roomWidth) && roomWidth > 0
      ? roomWidth
      : toUnitValue(DEFAULT_ROOM_WIDTH_FT, unit);
  const segmentCount = safeWidth <= 6 ? 4 : safeWidth <= 12 ? 5 : 6;

  return Array.from({ length: segmentCount + 1 }, (_, index) => {
    const value = (safeWidth / segmentCount) * index;
    return `${formatValue(value, "0")}${unit}`;
  });
}

function createFurnitureItem(template, unit) {
  return {
    id: `item-${nextFurnitureId++}`,
    type: template.type,
    name: template.name,
    width: toUnitValue(template.widthFt, unit),
    height: toUnitValue(template.heightFt, unit),
    rotation: 0,
    color: template.color,
    x: 0,
    y: 0,
  };
}

function getItemSizeLabel(width, height, unit) {
  return `${formatValue(width, "0")}${unit} x ${formatValue(height, "0")}${unit}`;
}

function getDefaultPlacement(
  index,
  itemWidth,
  itemHeight,
  roomDimensions,
  unit,
) {
  const horizontalBounds = getPositionBounds(itemWidth, roomDimensions.width);
  const verticalBounds = getPositionBounds(itemHeight, roomDimensions.length);
  const baseOffset = toUnitValue(1, unit);
  const horizontalStep = toUnitValue(3.5, unit);
  const verticalStep = toUnitValue(3, unit);

  return {
    x: roundToTwo(
      clamp(
        baseOffset + (index % 3) * horizontalStep,
        horizontalBounds.min,
        horizontalBounds.max,
      ),
    ),
    y: roundToTwo(
      clamp(
        baseOffset + Math.floor(index / 3) * verticalStep,
        verticalBounds.min,
        verticalBounds.max,
      ),
    ),
  };
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

function coerceDimensionNumber(rawValue, fallback, minimum, maximum) {
  if (rawValue === "") {
    return minimum;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return roundToTwo(clamp(parsedValue, minimum, maximum));
}

function coerceRotation(rawValue, fallback) {
  const parsedValue = Number(rawValue);

  if (!Number.isFinite(parsedValue)) {
    return fallback;
  }

  return clamp(Math.round(parsedValue), 0, 360);
}

function normalizeRotationAngle(value) {
  const normalized = Math.round(value) % 360;
  return normalized < 0 ? normalized + 360 : normalized;
}

function getPastedItem(sourceItem, roomDimensions, unit) {
  const offset = toUnitValue(1, unit);
  const nextItem = {
    ...sourceItem,
    id: `item-${nextFurnitureId++}`,
    x: sourceItem.x + offset,
    y: sourceItem.y + offset,
  };
  const horizontalBounds = getPositionBounds(
    nextItem.width,
    roomDimensions.width,
  );
  const verticalBounds = getPositionBounds(
    nextItem.height,
    roomDimensions.length,
  );

  return {
    ...nextItem,
    x: roundToTwo(
      clamp(nextItem.x, horizontalBounds.min, horizontalBounds.max),
    ),
    y: roundToTwo(clamp(nextItem.y, verticalBounds.min, verticalBounds.max)),
  };
}

function FurnitureGlyph({ type, className = "" }) {
  const sharedPathProps = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 3,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const glyphClassName = className
    ? `furniture-glyph ${className}`
    : "furniture-glyph";

  let glyphContent;

  switch (type) {
    case "Chair":
      glyphContent = (
        <>
          <rect
            x="18"
            y="18"
            width="28"
            height="22"
            rx="6"
            {...sharedPathProps}
          />
          <path d="M22 18V12H42V18" {...sharedPathProps} />
          <path d="M22 40V50" {...sharedPathProps} />
          <path d="M42 40V50" {...sharedPathProps} />
          <path d="M18 30H46" {...sharedPathProps} />
        </>
      );
      break;
    case "Sofa":
      glyphContent = (
        <>
          <rect
            x="12"
            y="22"
            width="40"
            height="18"
            rx="6"
            {...sharedPathProps}
          />
          <path d="M16 22V16H48V22" {...sharedPathProps} />
          <path d="M12 28H52" {...sharedPathProps} />
          <path d="M16 40V48" {...sharedPathProps} />
          <path d="M48 40V48" {...sharedPathProps} />
        </>
      );
      break;
    case "Desk":
      glyphContent = (
        <>
          <rect
            x="14"
            y="18"
            width="36"
            height="24"
            rx="4"
            {...sharedPathProps}
          />
          <path d="M20 24H44" {...sharedPathProps} />
          <path d="M20 30H38" {...sharedPathProps} />
          <path d="M20 42V50" {...sharedPathProps} />
          <path d="M44 42V50" {...sharedPathProps} />
        </>
      );
      break;
    case "Bed":
      glyphContent = (
        <>
          <rect
            x="16"
            y="12"
            width="32"
            height="40"
            rx="6"
            {...sharedPathProps}
          />
          <rect
            x="20"
            y="16"
            width="24"
            height="10"
            rx="4"
            {...sharedPathProps}
          />
          <path d="M16 32H48" {...sharedPathProps} />
          <path d="M20 52V56" {...sharedPathProps} />
          <path d="M44 52V56" {...sharedPathProps} />
        </>
      );
      break;
    case "Lamp":
      glyphContent = (
        <>
          <circle cx="32" cy="24" r="10" {...sharedPathProps} />
          <path d="M32 34V48" {...sharedPathProps} />
          <path d="M24 48H40" {...sharedPathProps} />
          <path d="M24 18L32 10L40 18" {...sharedPathProps} />
        </>
      );
      break;
    case "Storage":
      glyphContent = (
        <>
          <rect
            x="16"
            y="14"
            width="32"
            height="36"
            rx="6"
            {...sharedPathProps}
          />
          <path d="M16 26H48" {...sharedPathProps} />
          <path d="M16 38H48" {...sharedPathProps} />
          <path d="M32 14V50" {...sharedPathProps} />
        </>
      );
      break;
    case "Table":
    default:
      glyphContent = (
        <>
          <rect
            x="14"
            y="18"
            width="36"
            height="28"
            rx="8"
            {...sharedPathProps}
          />
          <path d="M32 18V46" {...sharedPathProps} />
          <path d="M14 32H50" {...sharedPathProps} />
        </>
      );
      break;
  }

  return (
    <svg viewBox="0 0 64 64" className={glyphClassName} aria-hidden="true">
      {glyphContent}
    </svg>
  );
}

function FurnitureLibraryPanel({
  searchTerm,
  unit,
  onSearchChange,
  onAddItem,
}) {
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
                  <div
                    className="library-item-icon"
                    style={{ "--item-accent": item.color }}
                  >
                    <FurnitureGlyph type={item.type} />
                  </div>
                  <h4>{item.name}</h4>
                  <p>
                    {getItemSizeLabel(
                      toUnitValue(item.widthFt, unit),
                      toUnitValue(item.heightFt, unit),
                      unit,
                    )}
                  </p>
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

function WorkspaceToolbar({
  unit,
  zoomPercent,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomOut,
  onZoomIn,
  onFitView,
}) {
  return (
    <div className="workspace-toolbar-shell">
      <div className="workspace-toolbar">
        <button
          type="button"
          className="tool-icon-button"
          aria-label="Undo"
          onClick={onUndo}
          disabled={!canUndo}
        >
          Undo
        </button>
        <button
          type="button"
          className="tool-icon-button"
          aria-label="Redo"
          onClick={onRedo}
          disabled={!canRedo}
        >
          Redo
        </button>

        <div className="tool-divider" />

        <button
          type="button"
          className="tool-icon-button"
          aria-label="Zoom out"
          onClick={onZoomOut}
        >
          -
        </button>
        <span className="tool-zoom-value">{zoomPercent}%</span>
        <button
          type="button"
          className="tool-icon-button"
          aria-label="Zoom in"
          onClick={onZoomIn}
        >
          +
        </button>
        <button
          type="button"
          className="tool-icon-button"
          aria-label="Fit to screen"
          onClick={onFitView}
        >
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

function FurnitureItem({
  item,
  isSelected,
  isDragging,
  isRotating,
  pixelsPerFoot,
  unit,
  onSelectItem,
  onStartMove,
  onStartResize,
  onStartRotate,
}) {
  const blockLeft = toPixels(item.x, pixelsPerFoot, unit);
  const blockTop = toPixels(item.y, pixelsPerFoot, unit);
  const blockWidth = toPixels(item.width, pixelsPerFoot, unit);
  const blockHeight = toPixels(item.height, pixelsPerFoot, unit);
  const itemAriaLabel = `${item.name}, ${getItemSizeLabel(
    item.width,
    item.height,
    unit,
  )}`;

  return (
    <div
      className={`furniture-block ${isSelected ? "selected" : ""} ${
        isDragging ? "dragging" : ""
      }`}
      style={{
        "--item-accent": item.color,
        left: `${blockLeft}px`,
        top: `${blockTop}px`,
        width: `${blockWidth}px`,
        height: `${blockHeight}px`,
        transform: `rotate(${item.rotation}deg)`,
        borderColor: item.color,
        backgroundColor: hexToRgba(item.color, isSelected ? 0.18 : 0.1),
      }}
      onPointerDown={(event) => {
        if (
          event.target instanceof HTMLElement &&
          event.target.closest(".resize-handle, .rotation-handle")
        ) {
          return;
        }

        onStartMove(event, item);
      }}
      onClick={(event) => {
        event.stopPropagation();
        onSelectItem(item.id);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectItem(item.id);
        }
      }}
      aria-label={itemAriaLabel}
      title={item.name}
    >
      <div className="furniture-block-content">
        <FurnitureGlyph type={item.type} className="furniture-block-icon" />
      </div>

      {isSelected ? (
        <>
          <div className="rotation-guide" aria-hidden="true" />
          <button
            type="button"
            className={`rotation-handle ${isRotating ? "active" : ""}`}
            onPointerDown={(event) => onStartRotate(event, item)}
            onClick={(event) => event.stopPropagation()}
            aria-label="Rotate item"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M18 11.5A6 6 0 1 0 15.75 16.2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14.4 7.25H18.75V11.6"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          {RESIZE_HANDLES.map((handle) => (
            <button
              key={handle.direction}
              type="button"
              className={`resize-handle ${handle.className}`}
              onPointerDown={(event) =>
                onStartResize(event, item, handle.direction)
              }
              onClick={(event) => event.stopPropagation()}
              aria-label={handle.ariaLabel}
            />
          ))}
        </>
      ) : null}
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
  onBeginSceneAction,
  onMoveItem,
  onResizeItem,
  onRotateItem,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) {
  const roomOutlineRef = useRef(null);
  const roomViewportRef = useRef(null);
  const interactionRef = useRef(null);
  const cleanupInteractionRef = useRef(null);
  const [activeInteraction, setActiveInteraction] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [roomViewportSize, setRoomViewportSize] = useState({
    width: 760,
    height: 520,
  });
  const shapeLabel = formatShape(roomSetup?.shape);
  const roomDimensions = getRoomDimensions(roomSetup, unit);
  const rulerMarks = useMemo(
    () => getRulerMarks(roomDimensions.width, unit),
    [roomDimensions.width, unit],
  );
  const minimumFurnitureSize = Math.min(
    toUnitValue(MIN_FURNITURE_SIZE_FT, unit),
    roomDimensions.width,
    roomDimensions.length,
  );
  const roomWidthFeet = toFeet(roomDimensions.width, unit);
  const roomLengthFeet = toFeet(roomDimensions.length, unit);
  const pixelsPerFoot = useMemo(() => {
    if (
      roomViewportSize.width <= 0 ||
      roomViewportSize.height <= 0 ||
      roomWidthFeet <= 0 ||
      roomLengthFeet <= 0
    ) {
      return 0;
    }

    return Math.max(
      1,
      Math.min(
        roomViewportSize.width / roomWidthFeet,
        roomViewportSize.height / roomLengthFeet,
      ),
    );
  }, [
    roomLengthFeet,
    roomViewportSize.height,
    roomViewportSize.width,
    roomWidthFeet,
  ]);
  const roomSurfaceWidth = roundToTwo(roomWidthFeet * pixelsPerFoot);
  const roomSurfaceHeight = roundToTwo(roomLengthFeet * pixelsPerFoot);
  const zoomPercent = Math.round(zoomLevel * 100);

  useEffect(() => {
    return () => {
      if (cleanupInteractionRef.current) {
        cleanupInteractionRef.current();
      }
    };
  }, []);

  useEffect(() => {
    const viewportElement = roomViewportRef.current;
    if (!viewportElement || typeof ResizeObserver === "undefined") {
      return undefined;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setRoomViewportSize({
        width: Math.max(
          220,
          entry.contentRect.width - ROOM_FRAME_PADDING_PX * 2,
        ),
        height: Math.max(
          220,
          entry.contentRect.height - ROOM_FRAME_PADDING_PX * 2,
        ),
      });
    });

    observer.observe(viewportElement);

    return () => observer.disconnect();
  }, []);

  const getPointerPosition = (clientX, clientY) => {
    const outlineElement = roomOutlineRef.current;
    if (!outlineElement || pixelsPerFoot <= 0) {
      return null;
    }

    const rect = outlineElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return {
      x: toCanvasUnits(clientX - rect.left, pixelsPerFoot, unit),
      y: toCanvasUnits(clientY - rect.top, pixelsPerFoot, unit),
    };
  };

  const stopInteraction = () => {
    if (cleanupInteractionRef.current) {
      cleanupInteractionRef.current();
      cleanupInteractionRef.current = null;
    }

    interactionRef.current = null;
    setActiveInteraction(null);
  };

  const startInteraction = (nextInteraction) => {
    stopInteraction();
    interactionRef.current = nextInteraction;
    setActiveInteraction({
      mode: nextInteraction.mode,
      itemId: nextInteraction.itemId,
    });

    const handlePointerMove = (event) => {
      const interaction = interactionRef.current;
      if (!interaction) {
        return;
      }

      if (interaction.mode === "pan") {
        setPanOffset({
          x: roundToTwo(
            interaction.startPanX + (event.clientX - interaction.startClientX),
          ),
          y: roundToTwo(
            interaction.startPanY + (event.clientY - interaction.startClientY),
          ),
        });
        return;
      }

      const pointerPosition = getPointerPosition(event.clientX, event.clientY);
      if (!pointerPosition) {
        return;
      }

      if (interaction.mode === "drag") {
        const horizontalBounds = getPositionBounds(
          interaction.width,
          roomDimensions.width,
        );
        const verticalBounds = getPositionBounds(
          interaction.height,
          roomDimensions.length,
        );
        const nextX = clamp(
          pointerPosition.x - interaction.offsetX,
          horizontalBounds.min,
          horizontalBounds.max,
        );
        const nextY = clamp(
          pointerPosition.y - interaction.offsetY,
          verticalBounds.min,
          verticalBounds.max,
        );

        onMoveItem(interaction.itemId, nextX, nextY);
        return;
      }

      if (interaction.mode === "rotate") {
        const angle =
          (Math.atan2(
            pointerPosition.y - interaction.centerY,
            pointerPosition.x - interaction.centerX,
          ) *
            180) /
            Math.PI +
          90;

        onRotateItem(interaction.itemId, normalizeRotationAngle(angle));
        return;
      }

      const startRight = interaction.startX + interaction.startWidth;
      const startBottom = interaction.startY + interaction.startHeight;

      let nextLeft = interaction.startX;
      let nextTop = interaction.startY;
      let nextRight = startRight;
      let nextBottom = startBottom;

      if (interaction.corner.includes("left")) {
        nextLeft = Math.min(
          pointerPosition.x,
          startRight - minimumFurnitureSize,
        );
      }

      if (interaction.corner.includes("right")) {
        nextRight = Math.max(
          pointerPosition.x,
          interaction.startX + minimumFurnitureSize,
        );
      }

      if (interaction.corner.includes("top")) {
        nextTop = Math.min(
          pointerPosition.y,
          startBottom - minimumFurnitureSize,
        );
      }

      if (interaction.corner.includes("bottom")) {
        nextBottom = Math.max(
          pointerPosition.y,
          interaction.startY + minimumFurnitureSize,
        );
      }

      onResizeItem(
        interaction.itemId,
        nextLeft,
        nextTop,
        nextRight - nextLeft,
        nextBottom - nextTop,
      );
    };

    const handlePointerEnd = () => {
      stopInteraction();
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerEnd);
    window.addEventListener("pointercancel", handlePointerEnd);

    cleanupInteractionRef.current = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerEnd);
      window.removeEventListener("pointercancel", handlePointerEnd);
    };
  };

  const handleCanvasPointerDown = (event) => {
    const target = event.target;
    if (target instanceof HTMLElement && target.closest(".furniture-block")) {
      return;
    }

    onDeselectItem();
  };

  const handleViewportPointerDown = (event) => {
    if (event.button !== 1) {
      return;
    }

    event.preventDefault();
    startInteraction({
      mode: "pan",
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPanX: panOffset.x,
      startPanY: panOffset.y,
    });
  };

  const handleItemPointerDown = (event, item) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectItem(item.id);

    const pointerPosition = getPointerPosition(event.clientX, event.clientY);
    if (!pointerPosition) {
      return;
    }

    onBeginSceneAction();
    startInteraction({
      mode: "drag",
      itemId: item.id,
      offsetX: pointerPosition.x - item.x,
      offsetY: pointerPosition.y - item.y,
      width: item.width,
      height: item.height,
    });
  };

  const handleResizeHandlePointerDown = (event, item, corner) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectItem(item.id);

    onBeginSceneAction();
    startInteraction({
      mode: "resize",
      itemId: item.id,
      corner,
      startX: item.x,
      startY: item.y,
      startWidth: item.width,
      startHeight: item.height,
    });
  };

  const handleRotateHandlePointerDown = (event, item) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onSelectItem(item.id);

    onBeginSceneAction();
    startInteraction({
      mode: "rotate",
      itemId: item.id,
      centerX: item.x + item.width / 2,
      centerY: item.y + item.height / 2,
    });
  };

  const handleZoomIn = () => {
    setZoomLevel((currentZoom) =>
      roundToTwo(
        clamp(currentZoom + CANVAS_ZOOM_STEP, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM),
      ),
    );
  };

  const handleZoomOut = () => {
    setZoomLevel((currentZoom) =>
      roundToTwo(
        clamp(currentZoom - CANVAS_ZOOM_STEP, MIN_CANVAS_ZOOM, MAX_CANVAS_ZOOM),
      ),
    );
  };

  const handleFitView = () => {
    setZoomLevel(1);
    setPanOffset({ x: 0, y: 0 });
  };

  return (
    <section className="workspace-center-panel">
      <WorkspaceToolbar
        unit={unit}
        zoomPercent={zoomPercent}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={onUndo}
        onRedo={onRedo}
        onZoomOut={handleZoomOut}
        onZoomIn={handleZoomIn}
        onFitView={handleFitView}
      />

      <div className="workspace-ruler">
        <div
          className="workspace-ruler-scale"
          style={{
            width: `${roomSurfaceWidth}px`,
            gridTemplateColumns: `repeat(${rulerMarks.length}, minmax(0, 1fr))`,
          }}
        >
          {rulerMarks.map((mark) => (
            <span key={mark}>{mark}</span>
          ))}
        </div>
      </div>

      <div
        ref={roomViewportRef}
        className={`workspace-canvas-shell ${
          activeInteraction?.mode === "pan" ? "is-panning" : ""
        }`}
        onPointerDown={handleViewportPointerDown}
      >
        <div className="room-stage">
          <div
            className="room-stage-transform"
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoomLevel})`,
            }}
          >
            <div
              className="room-frame"
              style={{
                padding: `${ROOM_FRAME_PADDING_PX}px`,
              }}
            >
              <div
                ref={roomOutlineRef}
                className={`room-outline ${
                  activeInteraction?.mode === "drag" ? "is-dragging" : ""
                } ${activeInteraction?.mode === "resize" ? "is-resizing" : ""} ${
                  activeInteraction?.mode === "rotate" ? "is-rotating" : ""
                }`}
                style={{
                  width: `${roomSurfaceWidth}px`,
                  height: `${roomSurfaceHeight}px`,
                }}
                onPointerDown={handleCanvasPointerDown}
                role="presentation"
              >
                <div className="room-shape-label">{shapeLabel}</div>

                {placedItems.length === 0 ? (
                  <div className="canvas-empty-state">
                    Add furniture from the library to start your layout.
                  </div>
                ) : null}

                {placedItems.map((item) => {
                  return (
                    <FurnitureItem
                      key={item.id}
                      item={item}
                      isSelected={item.id === selectedItemId}
                      isDragging={
                        activeInteraction?.mode === "drag" &&
                        activeInteraction.itemId === item.id
                      }
                      isRotating={
                        activeInteraction?.mode === "rotate" &&
                        activeInteraction.itemId === item.id
                      }
                      pixelsPerFoot={pixelsPerFoot}
                      unit={unit}
                      onSelectItem={onSelectItem}
                      onStartMove={handleItemPointerDown}
                      onStartResize={handleResizeHandlePointerDown}
                      onStartRotate={handleRotateHandlePointerDown}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="workspace-hud-row">
        <div className="workspace-chip-group">
          <span className="workspace-chip chip-success">
            Autosaved just now
          </span>
          <span className="workspace-chip">
            {formatValue(roomDimensions.length)}
            {unit} x {formatValue(roomDimensions.width)}
            {unit} Room
          </span>
        </div>

        <div className="workspace-hint">
          Middle mouse pans. Toolbar zooms. Arrow keys nudge selected items.
        </div>
      </div>
    </section>
  );
}

function PropertiesPanel({
  unit,
  roomDimensions,
  minimumFurnitureSize,
  selectedItem,
  hasItems,
  onUpdateSelectedItem,
  onRemoveSelectedItem,
  onClearItems,
  onDeselectItem,
  onBackToSetup,
}) {
  const [dimensionDrafts, setDimensionDrafts] = useState({});

  const getDraftKey = (itemId, field) => `${itemId}:${field}`;
  const getNumericDraft = (field) => {
    if (!selectedItem) {
      return null;
    }

    const draftKey = getDraftKey(selectedItem.id, field);
    return Object.prototype.hasOwnProperty.call(dimensionDrafts, draftKey)
      ? dimensionDrafts[draftKey]
      : null;
  };
  const widthDraft = getNumericDraft("width");
  const heightDraft = getNumericDraft("height");
  const xDraft = getNumericDraft("x");
  const yDraft = getNumericDraft("y");

  const handleDimensionDraftChange = (field, rawValue) => {
    if (!selectedItem || !/^-?\d*\.?\d*$/.test(rawValue)) {
      return;
    }

    const draftKey = getDraftKey(selectedItem.id, field);
    setDimensionDrafts((previousDrafts) => ({
      ...previousDrafts,
      [draftKey]: rawValue,
    }));

    if (rawValue !== "") {
      onUpdateSelectedItem(field, rawValue);
    }
  };

  const handleDimensionDraftBlur = (field) => {
    if (!selectedItem) {
      return;
    }

    const draftKey = getDraftKey(selectedItem.id, field);
    const fallbackValue =
      field === "width"
        ? selectedItem.width
        : field === "height"
          ? selectedItem.height
          : field === "x"
            ? selectedItem.x
            : selectedItem.y;
    const rawValue =
      dimensionDrafts[draftKey] ?? formatValue(fallbackValue, "");
    const horizontalBounds = getPositionBounds(
      selectedItem.width,
      roomDimensions.width,
    );
    const verticalBounds = getPositionBounds(
      selectedItem.height,
      roomDimensions.length,
    );
    const minimumValue =
      field === "width" || field === "height"
        ? minimumFurnitureSize
        : field === "x"
          ? horizontalBounds.min
          : verticalBounds.min;
    const maximumValue =
      field === "width"
        ? Number.POSITIVE_INFINITY
        : field === "height"
          ? Number.POSITIVE_INFINITY
          : field === "x"
            ? horizontalBounds.max
            : verticalBounds.max;
    const normalizedValue = formatValue(
      coerceDimensionNumber(
        rawValue,
        fallbackValue,
        minimumValue,
        maximumValue,
      ),
      "",
    );

    setDimensionDrafts((previousDrafts) => {
      const nextDrafts = { ...previousDrafts };
      delete nextDrafts[draftKey];
      return nextDrafts;
    });
    onUpdateSelectedItem(field, normalizedValue);
  };

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
            Select an item from the room canvas to edit transforms, position,
            rotation, and finish.
          </p>
        </div>
      ) : (
        <>
          <div className="properties-item">
            <span className="properties-pill">Furniture Item</span>
            <h3>{selectedItem.name}</h3>
            <p>
              {selectedItem.type} placeholder in{" "}
              {formatValue(selectedItem.width)}
              {unit} x {formatValue(selectedItem.height)}
              {unit}
            </p>
            <div className="properties-item-stats">
              <div className="properties-stat-card">
                <span>Footprint</span>
                <strong>
                  {getItemSizeLabel(
                    selectedItem.width,
                    selectedItem.height,
                    unit,
                  )}
                </strong>
              </div>
              <div className="properties-stat-card">
                <span>Placement</span>
                <strong>
                  {formatValue(selectedItem.x, "0")}
                  {unit}, {formatValue(selectedItem.y, "0")}
                  {unit}
                </strong>
              </div>
            </div>
          </div>

          <section className="properties-section">
            <h4>Item Details</h4>

            <div className="properties-readonly-grid">
              <div className="properties-readonly-card">
                <span>Item ID</span>
                <strong>{selectedItem.id}</strong>
              </div>
              <div className="properties-readonly-card">
                <span>Type</span>
                <strong>{selectedItem.type}</strong>
              </div>
              <div className="properties-readonly-card properties-readonly-wide">
                <span>Name</span>
                <strong>{selectedItem.name}</strong>
              </div>
            </div>
          </section>

          <section className="properties-section">
            <h4>Dimensions</h4>

            <div className="properties-two-col">
              <label
                className="properties-field"
                htmlFor="furniture-width-input"
              >
                Width ({unit})
                <input
                  id="furniture-width-input"
                  type="text"
                  inputMode="decimal"
                  value={widthDraft ?? formatValue(selectedItem.width, "")}
                  onChange={(event) =>
                    handleDimensionDraftChange("width", event.target.value)
                  }
                  onBlur={() => handleDimensionDraftBlur("width")}
                />
              </label>

              <label
                className="properties-field"
                htmlFor="furniture-height-input"
              >
                Height ({unit})
                <input
                  id="furniture-height-input"
                  type="text"
                  inputMode="decimal"
                  value={heightDraft ?? formatValue(selectedItem.height, "")}
                  onChange={(event) =>
                    handleDimensionDraftChange("height", event.target.value)
                  }
                  onBlur={() => handleDimensionDraftBlur("height")}
                />
              </label>
            </div>

            <div className="properties-two-col">
              <label className="properties-field" htmlFor="furniture-x-input">
                X Position ({unit})
                <input
                  id="furniture-x-input"
                  type="text"
                  inputMode="decimal"
                  value={xDraft ?? formatValue(selectedItem.x, "")}
                  onChange={(event) =>
                    handleDimensionDraftChange("x", event.target.value)
                  }
                  onBlur={() => handleDimensionDraftBlur("x")}
                />
              </label>

              <label className="properties-field" htmlFor="furniture-y-input">
                Y Position ({unit})
                <input
                  id="furniture-y-input"
                  type="text"
                  inputMode="decimal"
                  value={yDraft ?? formatValue(selectedItem.y, "")}
                  onChange={(event) =>
                    handleDimensionDraftChange("y", event.target.value)
                  }
                  onBlur={() => handleDimensionDraftBlur("y")}
                />
              </label>
            </div>

            <p className="properties-note">
              Enter exact dimensions or drag the edge and corner handles on the
              canvas. Minimum size: {formatValue(minimumFurnitureSize, "1")}
              {unit}.
            </p>
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
              <span>{selectedItem.rotation}&deg;</span>
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

            <label
              className="properties-field properties-color-field"
              htmlFor="furniture-color-input"
            >
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
        <button
          type="button"
          className="action-primary"
          onClick={onBackToSetup}
        >
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
  const roomDimensions = useMemo(
    () => getRoomDimensions(roomSetup, unit),
    [roomSetup, unit],
  );
  const minimumFurnitureSize = useMemo(
    () =>
      Math.min(
        toUnitValue(MIN_FURNITURE_SIZE_FT, unit),
        roomDimensions.width,
        roomDimensions.length,
      ),
    [roomDimensions.length, roomDimensions.width, unit],
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [placedItems, setPlacedItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [historyStack, setHistoryStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const clipboardRef = useRef(null);
  const placedItemsRef = useRef(placedItems);
  const selectedItemIdRef = useRef(selectedItemId);

  useEffect(() => {
    placedItemsRef.current = placedItems;
  }, [placedItems]);

  useEffect(() => {
    selectedItemIdRef.current = selectedItemId;
  }, [selectedItemId]);

  const selectedItem = useMemo(() => {
    return placedItems.find((item) => item.id === selectedItemId) ?? null;
  }, [placedItems, selectedItemId]);

  const recordHistorySnapshot = useCallback(() => {
    setHistoryStack((previousHistory) => [
      ...previousHistory.slice(-(MAX_HISTORY_STEPS - 1)),
      {
        items: cloneItems(placedItemsRef.current),
        selectedItemId: selectedItemIdRef.current,
      },
    ]);
    setRedoStack([]);
  }, []);

  const handleUndo = useCallback(() => {
    if (historyStack.length === 0) {
      return;
    }

    const previousSnapshot = historyStack[historyStack.length - 1];
    setRedoStack((previousRedo) => [
      ...previousRedo.slice(-(MAX_HISTORY_STEPS - 1)),
      {
        items: cloneItems(placedItemsRef.current),
        selectedItemId: selectedItemIdRef.current,
      },
    ]);
    setHistoryStack((previousHistory) => previousHistory.slice(0, -1));
    setPlacedItems(cloneItems(previousSnapshot.items));
    setSelectedItemId(previousSnapshot.selectedItemId);
  }, [historyStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) {
      return;
    }

    const nextSnapshot = redoStack[redoStack.length - 1];
    setHistoryStack((previousHistory) => [
      ...previousHistory.slice(-(MAX_HISTORY_STEPS - 1)),
      {
        items: cloneItems(placedItemsRef.current),
        selectedItemId: selectedItemIdRef.current,
      },
    ]);
    setRedoStack((previousRedo) => previousRedo.slice(0, -1));
    setPlacedItems(cloneItems(nextSnapshot.items));
    setSelectedItemId(nextSnapshot.selectedItemId);
  }, [redoStack]);

  const handleAddItem = (template) => {
    recordHistorySnapshot();
    const nextItem = createFurnitureItem(template, unit);
    const placement = getDefaultPlacement(
      placedItems.length,
      nextItem.width,
      nextItem.height,
      roomDimensions,
      unit,
    );
    const boundedItem = {
      ...nextItem,
      x: placement.x,
      y: placement.y,
    };

    setPlacedItems((previousItems) => [...previousItems, boundedItem]);
    setSelectedItemId(boundedItem.id);
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

        if (field === "width") {
          const nextWidth = coerceDimensionNumber(
            rawValue,
            item.width,
            minimumFurnitureSize,
            Math.max(roomDimensions.width * 4, minimumFurnitureSize),
          );
          const horizontalBounds = getPositionBounds(
            nextWidth,
            roomDimensions.width,
          );
          const nextX = roundToTwo(
            clamp(item.x, horizontalBounds.min, horizontalBounds.max),
          );

          return {
            ...item,
            x: nextX,
            width: nextWidth,
          };
        }

        if (field === "x") {
          const horizontalBounds = getPositionBounds(
            item.width,
            roomDimensions.width,
          );
          return {
            ...item,
            x: coerceDimensionNumber(
              rawValue,
              item.x,
              horizontalBounds.min,
              horizontalBounds.max,
            ),
          };
        }

        if (field === "height") {
          const nextHeight = coerceDimensionNumber(
            rawValue,
            item.height,
            minimumFurnitureSize,
            Math.max(roomDimensions.length * 4, minimumFurnitureSize),
          );
          const verticalBounds = getPositionBounds(
            nextHeight,
            roomDimensions.length,
          );
          const nextY = roundToTwo(
            clamp(item.y, verticalBounds.min, verticalBounds.max),
          );

          return {
            ...item,
            y: nextY,
            height: nextHeight,
          };
        }

        if (field === "y") {
          const verticalBounds = getPositionBounds(
            item.height,
            roomDimensions.length,
          );
          return {
            ...item,
            y: coerceDimensionNumber(
              rawValue,
              item.y,
              verticalBounds.min,
              verticalBounds.max,
            ),
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

  const handleResizeItem = useCallback(
    (itemId, nextX, nextY, nextWidth, nextHeight) => {
      setPlacedItems((previousItems) =>
        previousItems.map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          const width = roundToTwo(Math.max(nextWidth, minimumFurnitureSize));
          const height = roundToTwo(Math.max(nextHeight, minimumFurnitureSize));
          const horizontalBounds = getPositionBounds(
            width,
            roomDimensions.width,
          );
          const verticalBounds = getPositionBounds(
            height,
            roomDimensions.length,
          );
          const clampedX = roundToTwo(
            clamp(nextX, horizontalBounds.min, horizontalBounds.max),
          );
          const clampedY = roundToTwo(
            clamp(nextY, verticalBounds.min, verticalBounds.max),
          );

          return {
            ...item,
            x: clampedX,
            y: clampedY,
            width,
            height,
          };
        }),
      );
    },
    [minimumFurnitureSize, roomDimensions.length, roomDimensions.width],
  );

  const handleRemoveSelectedItem = useCallback(() => {
    if (!selectedItemId) {
      return;
    }

    recordHistorySnapshot();
    setPlacedItems((previousItems) =>
      previousItems.filter((item) => item.id !== selectedItemId),
    );
    setSelectedItemId(null);
  }, [recordHistorySnapshot, selectedItemId]);

  const handleClearItems = useCallback(() => {
    recordHistorySnapshot();
    setPlacedItems([]);
    setSelectedItemId(null);
  }, [recordHistorySnapshot]);

  const handleMoveItem = useCallback(
    (itemId, nextX, nextY) => {
      setPlacedItems((previousItems) =>
        previousItems.map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          const horizontalBounds = getPositionBounds(
            item.width,
            roomDimensions.width,
          );
          const verticalBounds = getPositionBounds(
            item.height,
            roomDimensions.length,
          );

          return {
            ...item,
            x: roundToTwo(
              clamp(nextX, horizontalBounds.min, horizontalBounds.max),
            ),
            y: roundToTwo(clamp(nextY, verticalBounds.min, verticalBounds.max)),
          };
        }),
      );
    },
    [roomDimensions.length, roomDimensions.width],
  );

  const handleRotateItem = useCallback((itemId, nextRotation) => {
    setPlacedItems((previousItems) =>
      previousItems.map((item) => {
        if (item.id !== itemId) {
          return item;
        }

        return {
          ...item,
          rotation: normalizeRotationAngle(nextRotation),
        };
      }),
    );
  }, []);

  const handleCopySelectedItem = useCallback(() => {
    if (!selectedItem) {
      return;
    }

    clipboardRef.current = { ...selectedItem };
  }, [selectedItem]);

  const handlePasteClipboardItem = useCallback(() => {
    if (!clipboardRef.current) {
      return;
    }

    recordHistorySnapshot();
    const pastedItem = getPastedItem(
      clipboardRef.current,
      roomDimensions,
      unit,
    );
    setPlacedItems((previousItems) => [...previousItems, pastedItem]);
    setSelectedItemId(pastedItem.id);
  }, [recordHistorySnapshot, roomDimensions, unit]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT" ||
          target.isContentEditable)
      ) {
        return;
      }

      const isMetaShortcut = event.ctrlKey || event.metaKey;

      if (isMetaShortcut && event.key.toLowerCase() === "c") {
        if (!selectedItem) {
          return;
        }

        event.preventDefault();
        handleCopySelectedItem();
        return;
      }

      if (isMetaShortcut && event.key.toLowerCase() === "v") {
        if (!clipboardRef.current) {
          return;
        }

        event.preventDefault();
        handlePasteClipboardItem();
        return;
      }

      if (
        isMetaShortcut &&
        event.key.toLowerCase() === "z" &&
        !event.shiftKey
      ) {
        event.preventDefault();
        handleUndo();
        return;
      }

      if (
        (isMetaShortcut && event.key.toLowerCase() === "y") ||
        (isMetaShortcut && event.shiftKey && event.key.toLowerCase() === "z")
      ) {
        event.preventDefault();
        handleRedo();
        return;
      }

      if (!selectedItem) {
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleRemoveSelectedItem();
        return;
      }

      const movementStep = toUnitValue(
        event.shiftKey ? 1 : KEYBOARD_NUDGE_FT,
        unit,
      );
      const nextPosition = {
        x: selectedItem.x,
        y: selectedItem.y,
      };

      if (event.key === "ArrowLeft") {
        nextPosition.x -= movementStep;
      } else if (event.key === "ArrowRight") {
        nextPosition.x += movementStep;
      } else if (event.key === "ArrowUp") {
        nextPosition.y -= movementStep;
      } else if (event.key === "ArrowDown") {
        nextPosition.y += movementStep;
      } else {
        return;
      }

      event.preventDefault();
      recordHistorySnapshot();
      handleMoveItem(selectedItem.id, nextPosition.x, nextPosition.y);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    handleCopySelectedItem,
    handleMoveItem,
    handlePasteClipboardItem,
    handleRedo,
    handleRemoveSelectedItem,
    handleUndo,
    recordHistorySnapshot,
    selectedItem,
    unit,
  ]);

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
            onBeginSceneAction={recordHistorySnapshot}
            onMoveItem={handleMoveItem}
            onResizeItem={handleResizeItem}
            onRotateItem={handleRotateItem}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyStack.length > 0}
            canRedo={redoStack.length > 0}
          />

          <PropertiesPanel
            unit={unit}
            roomDimensions={roomDimensions}
            minimumFurnitureSize={minimumFurnitureSize}
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
          <span>&copy; 2026 FurnitureViz</span>
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
