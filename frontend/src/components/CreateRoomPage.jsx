import { useMemo, useState } from "react";
import AppTopNav from "./AppTopNav";
import "./CreateRoomPage.css";

const ROOM_SHAPES = [
  {
    id: "rectangle",
    label: "Rectangle / Square",
    icon: "rectangle",
  },
  {
    id: "l-shape",
    label: "L-Shaped Room",
    icon: "l-shape",
  },
];

const WALL_COLOURS = [
  { name: "Pure White", hex: "#FFFFFF" },
  { name: "Warm Stone", hex: "#E5E1D8" },
  { name: "Soft Grey", hex: "#F2F2F2" },
  { name: "Sage Leaf", hex: "#D1DBCF" },
  { name: "Midnight", hex: "#2C3E50" },
  { name: "Navy Blue", hex: "#1A365D" },
  { name: "Terracotta", hex: "#C05621" },
];

const FEATURE_ITEMS = [
  {
    icon: "ruler",
    title: "Precise Rulers",
    description:
      "Toggle rulers in the workspace for millimeter-perfect furniture alignment.",
  },
  {
    icon: "square",
    title: "Multiple Shapes",
    description:
      "Start with a template and use the wall editor to add complex corners.",
  },
  {
    icon: "check",
    title: "Pro Visualization",
    description: "Instantly switch to 3D mode to walk through your creation.",
  },
];

const FEET_TO_METERS = 0.3048;
const METERS_TO_FEET = 3.28084;

function formatDimensionValue(value) {
  const rounded = Math.round(value * 100) / 100;

  if (!Number.isFinite(rounded)) {
    return "";
  }

  return Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(/\.?0+$/, "");
}

function convertDimensionValue(rawValue, factor) {
  if (rawValue.trim() === "") {
    return "";
  }

  const numericValue = Number(rawValue);
  if (!Number.isFinite(numericValue)) {
    return rawValue;
  }

  return formatDimensionValue(numericValue * factor);
}

function getUnitMeta(unit) {
  if (unit === "m") {
    return {
      short: "m",
      lengthPlaceholder: "e.g. 6",
      widthPlaceholder: "e.g. 4.5",
    };
  }

  return {
    short: "ft",
    lengthPlaceholder: "e.g. 20",
    widthPlaceholder: "e.g. 15",
  };
}

function RectangleShapeIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <rect
        x="2.35"
        y="2.35"
        width="15.3"
        height="15.3"
        rx="1.65"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function LShapeIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.64 4.19a.83.83 0 0 0-.83-.83H4.19a.83.83 0 0 0-.83.83v11.62c0 .46.37.83.83.83h11.62c.46 0 .83-.37.83-.83V4.19Zm1.66 11.62a2.5 2.5 0 0 1-2.49 2.49H4.19A2.5 2.5 0 0 1 1.7 15.81V4.19A2.5 2.5 0 0 1 4.19 1.7h11.62a2.5 2.5 0 0 1 2.49 2.49v11.62Z"
      />
      <path
        fill="currentColor"
        d="M17.47 6.67a.83.83 0 0 1 0 1.66H2.53a.83.83 0 0 1 0-1.66h14.94Zm-10.8 10.81a.83.83 0 0 0 1.66 0V7.52a.83.83 0 0 0-1.66 0v9.96Z"
      />
    </svg>
  );
}

function RulerIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.33 2.1a2 2 0 0 1 2.83 0l10.74 10.74a2 2 0 0 1 0 2.83l-2.23 2.23a2 2 0 0 1-2.83 0L2.1 7.16a2 2 0 0 1 0-2.83L4.33 2.1Zm.78 1.17L2.88 5.5a.33.33 0 0 0 0 .47L13.67 16.74a.33.33 0 0 0 .47 0l2.23-2.23a.33.33 0 0 0 0-.47L5.58 3.27a.33.33 0 0 0-.47 0Z"
      />
      <path
        fill="currentColor"
        d="M9.15 6.26a.83.83 0 0 1 1.18 0l.46.46a.83.83 0 1 1-1.18 1.18l-.46-.46a.83.83 0 0 1 0-1.18Zm-2.5-2.5a.83.83 0 0 1 1.18 0l.46.46a.83.83 0 0 1-1.18 1.18l-.46-.46a.83.83 0 0 1 0-1.18Zm5 5a.83.83 0 0 1 1.18 0l.46.46a.83.83 0 1 1-1.18 1.18l-.46-.46a.83.83 0 0 1 0-1.18Z"
      />
    </svg>
  );
}

function PaintbrushIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.5 12.27a.83.83 0 0 1 1.02-.6l8.86 2.42a.83.83 0 0 1-.44 1.6l-8.86-2.42a.83.83 0 0 1-.58-1Z"
      />
      <path
        fill="currentColor"
        d="M16.55.85c.34 0 .68.07.99.2a2.5 2.5 0 0 1 .84 4.08l-3.04 3.04.49.49a3 3 0 0 1 0 4.22l-.78.78a1.17 1.17 0 0 1-1.66 0L6.4 6.71a1.17 1.17 0 0 1 0-1.66l.78-.78a3 3 0 0 1 4.21 0l.49.49 3.05-3.04a2.5 2.5 0 0 1 1.62-.85Zm0 1.66a.82.82 0 0 0-.59.24L12.63 6.1a.83.83 0 0 1-1.18 0l-.78-.78a1.34 1.34 0 0 0-1.88 0l-.48.49 5.87 5.87.49-.48a1.34 1.34 0 0 0 0-1.88l-.78-.78a.83.83 0 0 1 0-1.18l3.34-3.34a.84.84 0 0 0-.59-1.42Z"
      />
      <path
        fill="currentColor"
        d="M7.5 6.37a.83.83 0 0 1 1.15.24c-.79 1.19-1.7 2.03-2.76 2.59a12.7 12.7 0 0 1-3.96 1.14l5.68 6.9c.82-.57 1.82-1.52 2.63-2.5.84-1.01 1.4-2 1.4-2.23a.83.83 0 1 1 1.66 0c0 .7-.45 1.54-1.13 2.51-.88 1.26-2.18 2.47-3.3 3.27a1.44 1.44 0 0 1-1.8-.14L.5 10.78a1.45 1.45 0 0 1 .77-2.37c1.9-.35 3.68-.67 5.99-2.04.07-.04.16-.04.24 0Z"
      />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M7 1.2A5.8 5.8 0 1 0 7 12.8 5.8 5.8 0 0 0 7 1.2Zm0-1.2a7 7 0 1 1 0 14 7 7 0 0 1 0-14Zm-.58 6.99c0-.32.26-.58.58-.58.32 0 .58.26.58.58v2.33a.58.58 0 1 1-1.16 0V6.99Zm.58-2.91h.01a.58.58 0 1 1 0 1.16H7a.58.58 0 0 1 0-1.16Z"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path
        fill="currentColor"
        d="M9.65 2.65a.5.5 0 0 1 .74.67l-.04.04-5.5 5.5a.5.5 0 0 1-.67.04l-.04-.04-2.5-2.5a.5.5 0 0 1 .67-.74l.04.04L4.5 7.79l5.15-5.15Z"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8.1 4.43a.83.83 0 0 0-1.18 1.17L11.32 10l-4.4 4.4a.83.83 0 0 0 1.17 1.18l.04-.04 4.98-4.98a.83.83 0 0 0 0-1.18L8.13 4.39l-.03.04Z"
      />
    </svg>
  );
}

function ShapeCardIcon({ icon }) {
  if (icon === "l-shape") {
    return <LShapeIcon />;
  }

  return <RectangleShapeIcon />;
}

function FeatureIcon({ icon }) {
  if (icon === "square") {
    return <RectangleShapeIcon />;
  }

  if (icon === "check") {
    return <CheckIcon />;
  }

  return <RulerIcon />;
}

function validateSetup(values) {
  const nextErrors = {};

  if (!values.shape) {
    nextErrors.shape = {
      kind: "shape-required",
      inline: "Please select a room shape.",
    };
  }

  if (values.length.trim() === "") {
    nextErrors.length = {
      kind: "length-required",
      inline: "Length is required.",
    };
  } else {
    const lengthValue = Number(values.length);
    if (!Number.isFinite(lengthValue) || lengthValue <= 0) {
      nextErrors.length = {
        kind: "length-non-positive",
        inline: "Room dimensions must be greater than 0",
      };
    }
  }

  if (values.width.trim() === "") {
    nextErrors.width = {
      kind: "width-required",
      inline: "Width is required.",
    };
  } else {
    const widthValue = Number(values.width);
    if (!Number.isFinite(widthValue) || widthValue <= 0) {
      nextErrors.width = {
        kind: "width-non-positive",
        inline: "Room dimensions must be greater than 0",
      };
    }
  }

  return nextErrors;
}

function CreateRoomPage({
  username,
  onGoDashboard,
  onCreateDesign,
  onSavedDesigns,
  onCancel,
  onCreateRoom,
  initialSetup,
}) {
  const [selectedShape, setSelectedShape] = useState(
    initialSetup?.shape ?? ROOM_SHAPES[0].id,
  );
  const [unit, setUnit] = useState(initialSetup?.unit === "m" ? "m" : "ft");
  const [length, setLength] = useState(
    initialSetup?.length !== undefined ? String(initialSetup.length) : "",
  );
  const [width, setWidth] = useState(
    initialSetup?.width !== undefined ? String(initialSetup.width) : "",
  );
  const [selectedWallColor, setSelectedWallColor] = useState(
    initialSetup?.wallColor ?? WALL_COLOURS[0].hex,
  );

  const [touched, setTouched] = useState({
    shape: false,
    length: false,
    width: false,
  });
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [errors, setErrors] = useState({});

  const validationValues = {
    shape: selectedShape,
    length,
    width,
  };
  const unitMeta = useMemo(() => getUnitMeta(unit), [unit]);

  const isFormValid = useMemo(() => {
    return (
      Object.keys(
        validateSetup({
          shape: selectedShape,
          length,
          width,
        }),
      ).length === 0
    );
  }, [selectedShape, length, width]);

  const runValidation = (overrides = {}) => {
    const nextValues = {
      ...validationValues,
      ...overrides,
    };

    const nextErrors = validateSetup(nextValues);
    setErrors(nextErrors);

    return { nextValues, nextErrors };
  };

  const handleShapeSelect = (shapeId) => {
    setSelectedShape(shapeId);

    const nextTouched = {
      ...touched,
      shape: true,
    };

    setTouched(nextTouched);

    if (submitAttempted || nextTouched.shape) {
      runValidation({ shape: shapeId });
    }
  };

  const handleDimensionChange = (field, rawValue) => {
    if (!/^\d*\.?\d*$/.test(rawValue)) {
      return;
    }

    if (field === "length") {
      setLength(rawValue);
    } else {
      setWidth(rawValue);
    }

    if (submitAttempted || touched[field]) {
      runValidation({ [field]: rawValue });
    }
  };

  const handleFieldBlur = (field) => {
    const nextTouched = {
      ...touched,
      [field]: true,
    };

    setTouched(nextTouched);
    runValidation();
  };

  const handleUnitToggle = (nextUnit) => {
    if (nextUnit === unit) {
      return;
    }

    const conversionFactor = unit === "ft" ? FEET_TO_METERS : METERS_TO_FEET;
    const nextLength = convertDimensionValue(length, conversionFactor);
    const nextWidth = convertDimensionValue(width, conversionFactor);

    setUnit(nextUnit);
    setLength(nextLength);
    setWidth(nextWidth);

    if (submitAttempted || touched.length || touched.width) {
      runValidation({
        length: nextLength,
        width: nextWidth,
      });
    }
  };

  const handleGenerateLayout = (event) => {
    event.preventDefault();
    setSubmitAttempted(true);

    const { nextValues, nextErrors } = runValidation();

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    onCreateRoom({
      shape: nextValues.shape,
      length: Number(nextValues.length),
      width: Number(nextValues.width),
      wallColor: selectedWallColor,
      unit,
    });
  };

  const showShapeError = (submitAttempted || touched.shape) && errors.shape;
  const showLengthError = (submitAttempted || touched.length) && errors.length;
  const showWidthError = (submitAttempted || touched.width) && errors.width;
  const showWidthHint =
    showWidthError && errors.width.kind === "width-non-positive";
  const generateDisabled = submitAttempted && !isFormValid;

  return (
    <div className="create-room-page">
      <AppTopNav
        username={username}
        activeTab="create"
        onDashboard={onGoDashboard}
        onCreateDesign={onCreateDesign}
        onSavedDesigns={onSavedDesigns}
      />

      <main className="create-room-main">
        <header className="create-room-header">
          <div>
            <h1>Create New Design</h1>
            <p>
              Define your room specifications to start your 2D/3D design layout.
            </p>
          </div>

          <div
            className="unit-toggle"
            role="group"
            aria-label="Measurement unit"
          >
            <button
              type="button"
              className={unit === "ft" ? "unit-toggle-active" : ""}
              aria-pressed={unit === "ft"}
              onClick={() => handleUnitToggle("ft")}
            >
              Feet (ft)
            </button>
            <button
              type="button"
              className={unit === "m" ? "unit-toggle-active" : ""}
              aria-pressed={unit === "m"}
              onClick={() => handleUnitToggle("m")}
            >
              Meters (m)
            </button>
          </div>
        </header>

        <div className="create-room-divider" />

        <div className="create-room-layout">
          <form
            className="create-room-card"
            onSubmit={handleGenerateLayout}
            noValidate
          >
            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon">
                  <LShapeIcon />
                </span>
                <div>
                  <h2>Room Shape</h2>
                  <p>
                    Select the architectural footprint of the space you are
                    designing.
                  </p>
                </div>
              </div>

              <div
                className="shape-options"
                role="radiogroup"
                aria-label="Room shape options"
              >
                {ROOM_SHAPES.map((shape) => (
                  <button
                    key={shape.id}
                    type="button"
                    role="radio"
                    aria-checked={selectedShape === shape.id}
                    className={`shape-card ${
                      selectedShape === shape.id ? "shape-card-active" : ""
                    }`}
                    onClick={() => handleShapeSelect(shape.id)}
                  >
                    <span className="shape-card-icon">
                      <ShapeCardIcon icon={shape.icon} />
                    </span>
                    <span>{shape.label}</span>
                    {selectedShape === shape.id ? (
                      <span className="shape-selected-dot">
                        <CheckIcon />
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>

              {showShapeError ? (
                <p className="inline-error">{errors.shape.inline}</p>
              ) : null}
            </section>

            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon">
                  <RulerIcon />
                </span>
                <div>
                  <h2>Room Dimensions</h2>
                  <p>Enter the maximum length and width of the space.</p>
                </div>
              </div>

              <div className="dimension-grid">
                <label className="field-group" htmlFor="room-length-input">
                  <span>Length ({unitMeta.short})</span>
                  <div
                    className={`input-shell ${showLengthError ? "input-shell-error" : ""}`}
                  >
                    <input
                      id="room-length-input"
                      type="text"
                      inputMode="decimal"
                      placeholder={unitMeta.lengthPlaceholder}
                      value={length}
                      onChange={(event) =>
                        handleDimensionChange("length", event.target.value)
                      }
                      onBlur={() => handleFieldBlur("length")}
                    />
                    <span>{unitMeta.short}</span>
                  </div>
                  {showLengthError ? (
                    <p className="inline-error">{errors.length.inline}</p>
                  ) : null}
                </label>

                <label className="field-group" htmlFor="room-width-input">
                  <span>Width ({unitMeta.short})</span>
                  <div
                    className={`input-shell ${showWidthError ? "input-shell-error" : ""}`}
                  >
                    <input
                      id="room-width-input"
                      type="text"
                      inputMode="decimal"
                      placeholder={unitMeta.widthPlaceholder}
                      value={width}
                      onChange={(event) =>
                        handleDimensionChange("width", event.target.value)
                      }
                      onBlur={() => handleFieldBlur("width")}
                    />
                    <span>{unitMeta.short}</span>
                  </div>
                  {showWidthError ? (
                    <p className="inline-error">{errors.width.inline}</p>
                  ) : null}
                  {showWidthHint ? (
                    <p className="inline-helper">
                      Enter a value greater than 0
                    </p>
                  ) : null}
                </label>
              </div>

              <div className="dimension-note">
                <InfoIcon />
                <p>
                  These dimensions define the outer boundaries of the room. You
                  can adjust wall thickness later in the workspace.
                </p>
              </div>
              <p className="dimension-note-strong">
                You can adjust furniture placement and layout later in the 2D
                workspace editor.
              </p>
            </section>

            <section className="setup-section">
              <div className="setup-heading">
                <span className="setup-heading-icon">
                  <PaintbrushIcon />
                </span>
                <div>
                  <h2>Default Wall Color</h2>
                  <p>
                    Choose a starting color for your walls. This can be
                    customized for individual walls later.
                  </p>
                </div>
              </div>

              <div className="wall-color-grid">
                {WALL_COLOURS.map((colour) => (
                  <button
                    key={colour.name}
                    type="button"
                    className={`wall-color-option ${
                      selectedWallColor === colour.hex
                        ? "wall-color-option-active"
                        : ""
                    }`}
                    onClick={() => setSelectedWallColor(colour.hex)}
                  >
                    <span className="wall-color-dot-wrap">
                      <span
                        className="wall-color-dot"
                        style={{ backgroundColor: colour.hex }}
                        aria-hidden="true"
                      >
                        {selectedWallColor === colour.hex ? (
                          <span className="wall-color-check">
                            <CheckIcon />
                          </span>
                        ) : null}
                      </span>
                    </span>
                    <span className="wall-color-name">{colour.name}</span>
                  </button>
                ))}
              </div>
            </section>

            <footer className="create-room-actions">
              <p>All progress is auto-saved to your dashboard drafts.</p>

              <div className="action-buttons">
                <button
                  type="button"
                  className="action-secondary"
                  onClick={onCancel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="action-primary"
                  disabled={generateDisabled}
                >
                  <span>Generate Layout</span>
                  <ChevronRightIcon />
                </button>
              </div>
            </footer>
          </form>
        </div>

        <section className="setup-feature-grid">
          {FEATURE_ITEMS.map((item) => (
            <article key={item.title} className="setup-feature-card">
              <span className="setup-feature-icon">
                <FeatureIcon icon={item.icon} />
              </span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
}

export default CreateRoomPage;
