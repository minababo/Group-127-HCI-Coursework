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
const DEFAULT_ROOM_WALL_COLOR = "#DCE7F5";
const DEFAULT_ROOM_FLOOR_COLOR = "#F8FAFC";

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

const ROOM_WALL_SWATCHES = [
  "#DCE7F5",
  "#E9DCCF",
  "#E7E3F8",
  "#DCEFD9",
  "#F3D9D7",
  "#E4E7EC",
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

function getDefaultRoomLabel(roomSetup) {
  return roomSetup?.name?.trim() || "Design Room";
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

function convertUnitValue(value, fromUnit, toUnit) {
  if (fromUnit === toUnit) {
    return roundToTwo(value);
  }

  return toUnitValue(toFeet(value, fromUnit), toUnit);
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

function clampItemsToRoom(items, roomDimensions) {
  return items.map((item) => {
    const horizontalBounds = getPositionBounds(item.width, roomDimensions.width);
    const verticalBounds = getPositionBounds(item.height, roomDimensions.length);

    return {
      ...item,
      x: roundToTwo(clamp(item.x, horizontalBounds.min, horizontalBounds.max)),
      y: roundToTwo(clamp(item.y, verticalBounds.min, verticalBounds.max)),
    };
  });
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

function PanelIconLayers() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M0.635742 4.66649C0.635776 4.40677 0.711171 4.15257 0.85297 3.93498C0.993502 3.71943 1.19334 3.54872 1.4281 3.44361L7.16953 0.830996L7.26835 0.789121C7.50212 0.697258 7.75129 0.649795 8.00314 0.649757C8.29091 0.649757 8.57552 0.711609 8.83736 0.830996L14.5925 3.4508C14.8273 3.55591 15.0265 3.72596 15.167 3.94152C15.3089 4.15913 15.3842 4.41327 15.3843 4.67303C15.3843 4.9329 15.309 5.18749 15.167 5.40519C15.0263 5.62092 14.8262 5.79082 14.5913 5.89591L14.5919 5.89657L8.84393 8.5085L8.84453 8.50917C8.61532 8.61369 8.36856 8.67372 8.11764 8.68712L8.01031 8.6904C7.75839 8.6904 7.50875 8.64297 7.27492 8.55104L7.17609 8.50917L1.42744 5.88937C1.19308 5.78422 0.993321 5.61392 0.85297 5.39864C0.711044 5.18095 0.635742 4.92636 0.635742 4.66649ZM1.98359 4.66975L7.73159 7.28957L7.79899 7.31577C7.867 7.33835 7.93835 7.3504 8.01031 7.3504L8.08167 7.34652C8.15295 7.33881 8.2229 7.31945 8.28843 7.28957L14.0377 4.6763L14.0443 4.67303L14.037 4.67041L8.28186 2.0506L8.28119 2.04995C8.19403 2.01023 8.09895 1.98975 8.00314 1.98975C7.93139 1.98979 7.86023 2.00129 7.79243 2.02378L7.7257 2.04995L7.72503 2.0506L1.97574 4.66649L1.98359 4.66975Z" />
      <path d="M14.6947 7.325C15.0414 7.32232 15.3289 7.58362 15.3659 7.92103L15.3699 7.98978L15.3673 8.08659C15.3527 8.31272 15.2808 8.53228 15.1579 8.7239C15.0175 8.94265 14.8165 9.11584 14.5795 9.22244L8.83343 11.8344L8.83215 11.835C8.57173 11.953 8.28899 12.0137 8.00316 12.0137C7.71727 12.0137 7.4346 11.953 7.17417 11.835L7.1735 11.8344L1.41111 9.2146L1.40719 9.21266C1.17459 9.10499 0.977671 8.9328 0.839912 8.71666C0.702207 8.50058 0.62925 8.24927 0.629887 7.99306L0.633813 7.92499C0.668908 7.58717 0.954904 7.32413 1.30185 7.325C1.67162 7.32607 1.96995 7.62657 1.96923 7.99634L7.72639 10.6142H7.72706C7.81382 10.6534 7.90796 10.6737 8.00316 10.6737C8.09817 10.6737 8.19204 10.6532 8.2786 10.6142L14.0273 8.00157L14.0299 8.00023L14.0325 7.93155C14.0643 7.59354 14.3478 7.32775 14.6947 7.325Z" />
      <path d="M14.6947 10.655C15.0414 10.6523 15.3289 10.9136 15.3659 11.251L15.3699 11.3198L15.3673 11.4166C15.3527 11.6427 15.2808 11.8623 15.1579 12.0539C15.0175 12.2727 14.8165 12.4458 14.5795 12.5524L8.83343 15.1644L8.83215 15.165C8.57173 15.283 8.28899 15.3437 8.00316 15.3437C7.71727 15.3437 7.4346 15.283 7.17417 15.165L7.1735 15.1644L1.41111 12.5446L1.40719 12.5427C1.17459 12.435 0.977671 12.2628 0.839912 12.0467C0.702207 11.8306 0.62925 11.5793 0.629887 11.3231L0.633813 11.255C0.668908 10.9172 0.954904 10.6541 1.30185 10.655C1.67162 10.6561 1.96995 10.9566 1.96923 11.3263L7.72639 13.9442H7.72706C7.81382 13.9834 7.90796 14.0037 8.00316 14.0037C8.09817 14.0037 8.19204 13.9832 8.2786 13.9442L14.0273 11.3316L14.0299 11.3302L14.0325 11.2616C14.0643 10.9235 14.3478 10.6578 14.6947 10.655Z" />
    </svg>
  );
}

function PanelIconSettings() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M7.90116 1.4143C8.15465 1.21938 8.5079 1.22036 8.76014 1.41671L9.35092 1.87646C9.54296 2.02595 9.7967 2.06653 10.0248 1.98379L10.7266 1.72944C11.0262 1.62082 11.3614 1.73434 11.5324 2.00363L11.9332 2.63462C12.0633 2.8395 12.2861 2.96794 12.5284 2.97813L13.2713 3.00939C13.5884 3.02273 13.8577 3.25159 13.9236 3.562L14.078 4.28935C14.1284 4.52691 14.2918 4.72516 14.5131 4.82079L15.1917 5.11431C15.4812 5.23958 15.6439 5.5562 15.5785 5.86676L15.4252 6.59436C15.3752 6.83198 15.4465 7.0794 15.6153 7.25438L16.1321 7.79013C16.3525 8.01859 16.3525 8.38141 16.1321 8.60987L15.6153 9.14562C15.4465 9.3206 15.3752 9.56802 15.4252 9.80564L15.5785 10.5332C15.6439 10.8438 15.4812 11.1604 15.1917 11.2857L14.5131 11.5792C14.2918 11.6748 14.1284 11.8731 14.078 12.1107L13.9236 12.838C13.8577 13.1484 13.5884 13.3773 13.2713 13.3906L12.5284 13.4219C12.2861 13.4321 12.0633 13.5605 11.9332 13.7654L11.5324 14.3964C11.3614 14.6657 11.0262 14.7792 10.7266 14.6706L10.0248 14.4162C9.7967 14.3335 9.54296 14.374 9.35092 14.5235L8.76014 14.9833C8.5079 15.1796 8.15465 15.1806 7.90116 14.9857L7.30775 14.5294C7.1148 14.381 6.86059 14.3419 6.63288 14.4259L5.93259 14.6844C5.63362 14.7947 5.29779 14.683 5.12533 14.4146L4.72095 13.7857C4.58972 13.5816 4.36622 13.4543 4.1239 13.4454L3.38086 13.4181C3.06369 13.4064 2.79315 13.1788 2.72568 12.8687L2.56762 12.1421C2.51597 11.9048 2.35162 11.7074 2.12992 11.6128L1.4498 11.323C1.1597 11.1993 0.995293 10.8837 1.05898 10.5728L1.20868 9.84441C1.25755 9.6066 1.18515 9.35951 1.01547 9.18544L0.496094 8.65162C0.274975 8.42405 0.273299 8.06124 0.492313 7.83164L1.00599 7.29328C1.1738 7.11734 1.24463 6.8698 1.19359 6.63242L1.03712 5.90435C0.970351 5.59366 1.1343 5.2777 1.42399 5.1534L2.10265 4.86209C2.32399 4.76708 2.48794 4.56932 2.539 4.3319L2.69534 3.60423C2.76206 3.29356 3.0319 3.0656 3.34899 3.05294L4.09197 3.02328C4.33431 3.0136 4.5574 2.88568 4.6881 2.68099L5.09116 2.05095C5.26313 1.78214 5.59881 1.66943 5.8981 1.77904L6.59935 2.03584C6.82734 2.11937 7.0814 2.07928 7.27395 1.93012L7.90116 1.4143ZM8.33065 4.75196C6.53573 4.75196 5.08065 6.20704 5.08065 8.00196C5.08065 9.79689 6.53573 11.252 8.33065 11.252C10.1256 11.252 11.5807 9.79689 11.5807 8.00196C11.5807 6.20704 10.1256 4.75196 8.33065 4.75196Z" />
    </svg>
  );
}

function PanelIconSearch() {
  return (
    <svg viewBox="0 0 15 15" aria-hidden="true">
      <path d="M9.95736 9.9575C10.188 9.72685 10.5528 9.71262 10.8002 9.91447L10.8482 9.9575L13.5823 12.6916L13.626 12.7396C13.8276 12.987 13.8129 13.3519 13.5823 13.5825C13.3517 13.813 12.9869 13.8278 12.7394 13.6262L12.6915 13.5825L9.95736 10.8484L9.91433 10.8004C9.71248 10.5529 9.72672 10.1881 9.95736 9.9575Z" />
      <path d="M11.29 6.88001C11.29 4.44443 9.31554 2.47001 6.87996 2.47001C4.44439 2.47001 2.46996 4.44443 2.46996 6.88001C2.46996 9.31559 4.44439 11.29 6.87996 11.29C9.31554 11.29 11.29 9.31559 11.29 6.88001ZM12.55 6.88001C12.55 10.0115 10.0114 12.55 6.87996 12.55C3.74851 12.55 1.20996 10.0115 1.20996 6.88001C1.20996 3.74855 3.74851 1.21001 6.87996 1.21001C10.0114 1.21001 12.55 3.74855 12.55 6.88001Z" />
    </svg>
  );
}

function PanelIconChevronDown() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M11.5462 5.51631C11.8078 5.25465 12.232 5.25465 12.4936 5.51631C12.7553 5.77796 12.7553 6.20207 12.4936 6.46373L8.47359 10.4837C8.21195 10.7454 7.78784 10.7454 7.52621 10.4837L3.50619 6.46373L3.46039 6.4127C3.24576 6.14953 3.26089 5.7616 3.50619 5.51631C3.75149 5.27101 4.13942 5.25587 4.40258 5.47051L4.45361 5.51631L7.9999 9.06261L11.5462 5.51631Z" />
    </svg>
  );
}

function PanelIconInfo() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M10.5 6C10.5 3.51472 8.4853 1.5 6 1.5C3.51472 1.5 1.5 3.51472 1.5 6C1.5 8.4853 3.51472 10.5 6 10.5C8.4853 10.5 10.5 8.4853 10.5 6ZM11.5 6C11.5 9.03755 9.03755 11.5 6 11.5C2.96244 11.5 0.5 9.03755 0.5 6C0.5 2.96244 2.96244 0.5 6 0.5C9.03755 0.5 11.5 2.96244 11.5 6Z" />
      <path d="M5.5 8L5.5 6C5.5 5.72385 5.72385 5.5 6 5.5C6.27615 5.5 6.5 5.72385 6.5 6L6.5 8C6.5 8.27615 6.27615 8.5 6 8.5C5.72385 8.5 5.5 8.27615 5.5 8Z" />
      <path d="M6.0049 3.5L6.05615 3.50244C6.30825 3.52805 6.5049 3.74112 6.5049 4C6.5049 4.25888 6.30825 4.47195 6.05615 4.49756L6.0049 4.5H6C5.72385 4.5 5.5 4.27614 5.5 4C5.5 3.72386 5.72385 3.5 6 3.5H6.0049Z" />
    </svg>
  );
}

function PanelIconPlus() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M9.5 5.5C9.77615 5.5 10 5.72385 10 6C10 6.27615 9.77615 6.5 9.5 6.5L2.5 6.5C2.22386 6.5 2 6.27615 2 6C2 5.72385 2.22386 5.5 2.5 5.5L9.5 5.5Z" />
      <path d="M5.5 9.5L5.5 2.5C5.5 2.22386 5.72385 2 6 2C6.27615 2 6.5 2.22386 6.5 2.5L6.5 9.5C6.5 9.77615 6.27615 10 6 10C5.72385 10 5.5 9.77615 5.5 9.5Z" />
    </svg>
  );
}

function PanelIconCopy() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M12.2304 5.84999C12.2304 5.52966 11.9707 5.26999 11.6504 5.26999L5.85035 5.26999C5.53003 5.26999 5.27035 5.52966 5.27035 5.84999L5.27035 11.65C5.27035 11.9703 5.53003 12.23 5.85035 12.23L11.6504 12.23C11.9707 12.23 12.2304 11.9703 12.2304 11.65L12.2304 5.84999ZM13.3904 11.65C13.3904 12.611 12.6114 13.39 11.6504 13.39L5.85035 13.39C4.88938 13.39 4.11035 12.611 4.11035 11.65L4.11035 5.84999C4.11035 4.88901 4.88938 4.10999 5.85035 4.10999L11.6504 4.10999C12.6114 4.10999 13.3904 4.88901 13.3904 5.84999L13.3904 11.65Z" />
      <path d="M8.73035 2.34999C8.73035 2.03231 8.46802 1.76999 8.15035 1.76999L2.35035 1.76999C2.03267 1.76999 1.77035 2.03231 1.77035 2.34999L1.77035 8.14999C1.77035 8.46765 2.03267 8.72999 2.35035 8.72999C2.67067 8.72999 2.93035 8.98965 2.93035 9.30999C2.93035 9.63032 2.67067 9.88999 2.35035 9.88999C1.39203 9.88999 0.610352 9.10832 0.610352 8.14999L0.610352 2.34999C0.610352 1.39166 1.39203 0.609985 2.35035 0.609985L8.15035 0.609985C9.10869 0.609985 9.89035 1.39166 9.89035 2.34999C9.89035 2.67031 9.63068 2.92999 9.31035 2.92999C8.99002 2.92999 8.73035 2.67031 8.73035 2.34999Z" />
    </svg>
  );
}

function PanelIconLock() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path d="M11.6402 7.60005C11.6402 7.27971 11.3805 7.02005 11.0602 7.02005L2.9402 7.02005C2.61987 7.02005 2.3602 7.27971 2.3602 7.60005L2.3602 11.66C2.3602 11.9804 2.61987 12.24 2.9402 12.24L11.0602 12.24C11.3805 12.24 11.6402 11.9804 11.6402 11.66L11.6402 7.60005ZM12.8002 11.66C12.8002 12.621 12.0212 13.4 11.0602 13.4L2.9402 13.4C1.97922 13.4 1.2002 12.621 1.2002 11.66L1.2002 7.60005C1.2002 6.63904 1.97922 5.86005 2.9402 5.86005L11.0602 5.86005C12.0212 5.86005 12.8002 6.63904 12.8002 7.60005L12.8002 11.66Z" />
      <path d="M3.51953 6.3999L3.51953 4.07992C3.51883 3.21722 3.8385 2.38491 4.41672 1.74463C4.99516 1.10417 5.79142 0.701382 6.65008 0.614648C7.5086 0.527998 8.36874 0.76332 9.06352 1.27508C9.71486 1.75489 10.1774 2.44566 10.3742 3.22692L10.4099 3.38437L10.4189 3.44329C10.448 3.73582 10.2511 4.00884 9.95672 4.06859C9.66243 4.12823 9.37498 3.95346 9.28781 3.67268L9.27307 3.61547L9.24929 3.51069C9.11816 2.98971 8.80965 2.52903 8.37535 2.20909C7.91216 1.86794 7.33854 1.71117 6.7662 1.76899C6.19385 1.82685 5.66324 2.09539 5.27766 2.52231C4.89215 2.94924 4.67898 3.50413 4.67953 4.07936L4.67953 6.3999C4.67953 6.72024 4.41986 6.97991 4.09953 6.97991C3.77921 6.97991 3.51953 6.72024 3.51953 6.3999Z" />
    </svg>
  );
}

function PanelIconTrash() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M14.0298 3.32996C14.3998 3.32996 14.6998 3.62993 14.6998 3.99996C14.6998 4.36998 14.3998 4.66996 14.0298 4.66996L1.9698 4.66996C1.59978 4.66996 1.2998 4.36998 1.2998 3.99996C1.2998 3.62993 1.59978 3.32996 1.9698 3.32996L14.0298 3.32996Z" />
      <path d="M2.63965 13.35L2.63965 3.96999C2.63965 3.59996 2.93962 3.29999 3.30965 3.29999C3.67968 3.29999 3.97965 3.59996 3.97965 3.96999L3.97965 13.35C3.97965 13.4671 4.04489 13.6403 4.20211 13.7975C4.35933 13.9547 4.53255 14.02 4.64965 14.02L11.3496 14.02C11.4668 14.02 11.64 13.9547 11.7972 13.7975C11.9544 13.6403 12.0196 13.4671 12.0196 13.35L12.0196 3.96999C12.0196 3.59996 12.3196 3.29999 12.6896 3.29999C13.0597 3.29999 13.3596 3.59996 13.3596 3.96999L13.3596 13.35C13.3596 13.9029 13.0899 14.3997 12.7446 14.7449C12.3993 15.0902 11.9025 15.36 11.3496 15.36L4.64965 15.36C4.09674 15.36 3.59997 15.0902 3.25469 14.7449C2.9094 14.3997 2.63965 13.9029 2.63965 13.35Z" />
      <path d="M10.0094 4.00997L10.0094 2.66997C10.0094 2.55288 9.94416 2.37966 9.78697 2.22243C9.62972 2.06522 9.45653 1.99997 9.33941 1.99997L6.65941 1.99997C6.54232 1.99997 6.3691 2.06522 6.21187 2.22243C6.05466 2.37966 5.98941 2.55288 5.98941 2.66997L5.98941 4.00997C5.98941 4.38 5.68944 4.67997 5.31941 4.67997C4.94939 4.67997 4.64941 4.38 4.64941 4.00997L4.64941 2.66997C4.64941 2.11707 4.91917 1.62029 5.26445 1.27501C5.60973 0.929729 6.10651 0.659973 6.65941 0.659973L9.33941 0.659973C9.8923 0.659973 10.3891 0.929729 10.7344 1.27501C11.0797 1.62029 11.3494 2.11707 11.3494 2.66997L11.3494 4.00997C11.3494 4.38 11.0495 4.67997 10.6794 4.67997C10.3094 4.67997 10.0094 4.38 10.0094 4.00997Z" />
      <path d="M6 11.34L6 7.31996C6 6.94992 6.29997 6.64996 6.67 6.64996C7.04004 6.64996 7.34 6.94992 7.34 7.31996L7.34 11.34C7.34 11.71 7.04004 12.01 6.67 12.01C6.29997 12.01 6 11.71 6 11.34Z" />
      <path d="M8.66016 11.34L8.66016 7.31996C8.66016 6.94992 8.96012 6.64996 9.33016 6.64996C9.7002 6.64996 10.0002 6.94992 10.0002 7.31996L10.0002 11.34C10.0002 11.71 9.7002 12.01 9.33016 12.01C8.96012 12.01 8.66016 11.71 8.66016 11.34Z" />
    </svg>
  );
}

function PanelIconSave() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1.2998 12.69L1.2998 3.31C1.2998 2.77692 1.51173 2.26582 1.88867 1.88887C2.26562 1.51192 2.77672 1.3 3.3098 1.3L10.1531 1.3C10.6809 1.30752 11.184 1.52313 11.5546 1.89868L11.5552 1.89803L14.1018 4.44455H14.1011C14.4769 4.81522 14.6923 5.31877 14.6998 5.84671L14.6998 12.69C14.6998 13.2231 14.4879 13.7342 14.1109 14.1111C13.734 14.4881 13.2229 14.7 12.6898 14.7L3.3098 14.7C2.77672 14.7 2.26562 14.4881 1.88867 14.1111C1.51173 13.7342 1.2998 13.2231 1.2998 12.69ZM2.6398 12.69C2.6398 12.8677 2.71044 13.0381 2.83609 13.1637C2.96175 13.2894 3.13211 13.36 3.3098 13.36L12.6898 13.36C12.8675 13.36 13.0379 13.2894 13.1635 13.1637C13.2892 13.0381 13.3598 12.8677 13.3598 12.69L13.3598 5.86568L13.3559 5.7996C13.3386 5.64731 13.2694 5.50477 13.1589 5.39656L13.1537 5.39197L10.6032 2.84087C10.495 2.73046 10.3525 2.66119 10.2002 2.64393L10.1341 2.64L3.3098 2.64C3.13211 2.64 2.96175 2.71064 2.83609 2.83629C2.71044 2.96194 2.6398 3.13231 2.6398 3.31L2.6398 12.69Z" />
      <path d="M10.68 14.01L10.68 9.32L5.31998 9.32L5.31998 14.01C5.31998 14.38 5.02001 14.68 4.64998 14.68C4.27995 14.68 3.97998 14.38 3.97998 14.01L3.97998 9.32C3.97998 8.96464 4.12126 8.62387 4.37256 8.37256C4.62386 8.12131 4.96459 7.98 5.31998 7.98L10.68 7.98C11.0353 7.98 11.3761 8.12131 11.6274 8.37256C11.8787 8.62387 12.02 8.96464 12.02 9.32L12.02 14.01C12.02 14.38 11.72 14.68 11.35 14.68C10.9799 14.68 10.68 14.38 10.68 14.01Z" />
      <path d="M3.97998 4.675L3.97998 1.995C3.97998 1.62498 4.27995 1.325 4.64998 1.325C5.02001 1.325 5.31998 1.62498 5.31998 1.995L5.31998 4.675L10.01 4.675C10.38 4.675 10.68 4.97498 10.68 5.345C10.68 5.71503 10.38 6.015 10.01 6.015L5.31998 6.015C4.96459 6.015 4.62386 5.87372 4.37256 5.62242C4.12126 5.37113 3.97998 5.03039 3.97998 4.675Z" />
    </svg>
  );
}

function InlineColorPickerButton({
  value,
  isActive,
  label,
  onChange,
}) {
  const inputRef = useRef(null);

  return (
    <>
      <button
        type="button"
        className={`swatch swatch-custom ${isActive ? "active" : ""}`}
        aria-label={label}
        onClick={() => inputRef.current?.click()}
      >
        <span className="swatch-custom-wheel" />
      </button>
      <input
        ref={inputRef}
        className="swatch-custom-input"
        type="color"
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
      />
    </>
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
          <span className="panel-leading-icon">
            <PanelIconLayers />
          </span>
          <h2>Furniture Library</h2>
        </div>

        <div className="library-search">
          <span className="library-search-icon">
            <PanelIconSearch />
          </span>
          <input
            type="text"
            placeholder="Search items..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </div>

      <div className="library-content">
        {filteredSections.length === 0 ? (
          <p className="library-empty">No furniture matches your search.</p>
        ) : null}

        {filteredSections.map((section) => (
          <section key={section.title} className="library-section">
            <div className="library-section-title">
              <h3>{section.title}</h3>
              <span className="library-chevron">
                <PanelIconChevronDown />
              </span>
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
        <div className="library-footer-note">
          <span className="library-footer-icon">
            <PanelIconInfo />
          </span>
          <p>Click items to place them on the canvas.</p>
        </div>
        <button type="button" className="library-footer-button">
          <PanelIconPlus />
          <span>Custom Item</span>
        </button>
      </div>
    </aside>
  );
}

function ToolbarIconUndo() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M5.58165 2.13049C5.84481 1.91585 6.23274 1.93099 6.47804 2.17629C6.72331 2.42159 6.73845 2.80952 6.52384 3.07268L6.47804 3.12371L3.60175 6L6.47804 8.87631L6.52384 8.9273C6.73845 9.19047 6.72331 9.5784 6.47804 9.82369C6.23274 10.069 5.84481 10.0841 5.58165 9.86952L5.53061 9.82369L2.18061 6.47371C1.91896 6.21206 1.91896 5.78794 2.18061 5.52629L5.53061 2.17629L5.58165 2.13049Z" />
      <path d="M12.6897 9.67C12.6897 9.2741 12.6115 8.88222 12.4601 8.51646C12.3086 8.15071 12.0864 7.81826 11.8064 7.53833C11.5265 7.25834 11.194 7.03617 10.8283 6.88468C10.4625 6.73319 10.0706 6.655 9.67473 6.655L2.63973 6.655C2.2697 6.655 1.96973 6.35503 1.96973 5.985C1.96973 5.61497 2.2697 5.315 2.63973 5.315L9.67473 5.315C10.2466 5.315 10.8129 5.42787 11.3412 5.64673C11.8696 5.86559 12.3501 6.18583 12.7545 6.59023C13.1589 6.99463 13.4791 7.47515 13.698 8.00351C13.9168 8.53187 14.0297 9.09809 14.0297 9.67L14.0245 9.88393C14 10.3827 13.8895 10.8741 13.698 11.3365C13.4791 11.8649 13.1589 12.3454 12.7545 12.7498C12.3501 13.1542 11.8696 13.4744 11.3412 13.6933C10.8129 13.9121 10.2466 14.025 9.67473 14.025L7.32973 14.025C6.95969 14.025 6.65973 13.725 6.65973 13.355C6.65973 12.985 6.95969 12.685 7.32973 12.685H9.67473C10.0706 12.685 10.4625 12.6068 10.8283 12.4553C11.194 12.3038 11.5265 12.0817 11.8064 11.8017C12.0864 11.5217 12.3086 11.1893 12.4601 10.8235C12.5926 10.5036 12.6688 10.1637 12.6858 9.81854L12.6897 9.67Z" />
    </svg>
  );
}

function ToolbarIconRedo() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M9.52147 2.1763C9.76676 1.931 10.1547 1.91586 10.4179 2.1305L10.4689 2.1763L13.8189 5.5263C14.0806 5.78795 14.0806 6.21207 13.8189 6.47372L10.4689 9.82369C10.2072 10.0854 9.78311 10.0854 9.52147 9.82369C9.25977 9.56206 9.25977 9.13795 9.52147 8.87631L12.3977 6.00001L9.52147 3.12372L9.47564 3.07268C9.26104 2.80953 9.27618 2.42159 9.52147 2.1763Z" />
      <path d="M1.96973 9.67C1.96973 8.51499 2.42823 7.40694 3.24495 6.59023C4.06167 5.7735 5.16971 5.315 6.32473 5.315L13.3597 5.315C13.7298 5.315 14.0297 5.61497 14.0297 5.985C14.0297 6.35503 13.7298 6.655 13.3597 6.655L6.32473 6.655C5.5251 6.655 4.75845 6.97285 4.19303 7.53833C3.62761 8.10374 3.30973 8.87036 3.30973 9.67L3.31365 9.81854C3.33068 10.1637 3.40689 10.5036 3.53938 10.8235C3.6909 11.1893 3.91306 11.5217 4.19303 11.8017C4.75845 12.3672 5.5251 12.685 6.32473 12.685L8.66973 12.685C9.03977 12.685 9.33973 12.985 9.33973 13.355C9.33973 13.725 9.03977 14.025 8.66973 14.025L6.32473 14.025C5.24194 14.025 4.20085 13.6216 3.40199 12.8983L3.24495 12.7498C2.84055 12.3454 2.52031 11.8649 2.30146 11.3365C2.10993 10.8741 1.99949 10.3827 1.97496 9.88393L1.96973 9.67Z" />
    </svg>
  );
}

function ToolbarIconZoomOut() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M12.0198 7.33C12.0198 4.73979 9.92002 2.64 7.3298 2.64C4.73959 2.64 2.6398 4.73979 2.6398 7.33C2.6398 9.92022 4.73959 12.02 7.3298 12.02C9.92002 12.02 12.0198 9.92022 12.0198 7.33ZM13.3598 7.33C13.3598 10.6603 10.6601 13.36 7.3298 13.36C3.99953 13.36 1.2998 10.6603 1.2998 7.33C1.2998 3.99973 3.99953 1.3 7.3298 1.3C10.6601 1.3 13.3598 3.99973 13.3598 7.33Z" />
      <path d="M10.6151 10.6157C10.8604 10.3704 11.2483 10.3553 11.5115 10.5699L11.5625 10.6157L14.4768 13.5299L14.5232 13.581C14.7378 13.8441 14.722 14.232 14.4768 14.4773C14.2315 14.7226 13.8435 14.7384 13.5804 14.5238L13.5293 14.4773L10.6151 11.5631L10.5692 11.5121C10.3546 11.2489 10.3698 10.861 10.6151 10.6157Z" />
      <path d="M9.33941 6.66C9.70946 6.66 10.0094 6.95996 10.0094 7.33C10.0094 7.70004 9.70946 8 9.33941 8L5.31941 8C4.94939 8 4.64941 7.70004 4.64941 7.33C4.64941 6.95996 4.94939 6.66 5.31941 6.66L9.33941 6.66Z" />
    </svg>
  );
}

function ToolbarIconZoomIn() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M12.0198 7.33C12.0198 4.73979 9.92002 2.64 7.3298 2.64C4.73959 2.64 2.6398 4.73979 2.6398 7.33C2.6398 9.92022 4.73959 12.02 7.3298 12.02C9.92002 12.02 12.0198 9.92022 12.0198 7.33ZM13.3598 7.33C13.3598 10.6603 10.6601 13.36 7.3298 13.36C3.99953 13.36 1.2998 10.6603 1.2998 7.33C1.2998 3.99973 3.99953 1.3 7.3298 1.3C10.6601 1.3 13.3598 3.99973 13.3598 7.33Z" />
      <path d="M10.6151 10.6156C10.8604 10.3704 11.2483 10.3552 11.5115 10.5699L11.5625 10.6156L14.4767 13.5299L14.5232 13.5809C14.7378 13.8441 14.722 14.232 14.4767 14.4773C14.2315 14.7226 13.8435 14.7384 13.5804 14.5238L13.5294 14.4773L10.6151 11.5631L10.5693 11.512C10.3546 11.2489 10.3698 10.861 10.6151 10.6156Z" />
      <path d="M6.66016 9.34L6.66016 5.32C6.66016 4.94997 6.96012 4.65 7.33016 4.65C7.7002 4.65 8.00016 4.94997 8.00016 5.32L8.00016 9.34C8.00016 9.71004 7.7002 10.01 7.33016 10.01C6.96012 10.01 6.66016 9.71004 6.66016 9.34Z" />
      <path d="M9.33941 6.66C9.70946 6.66 10.0094 6.95996 10.0094 7.33C10.0094 7.70004 9.70946 8 9.33941 8L5.31941 8C4.94939 8 4.64941 7.70004 4.64941 7.33C4.64941 6.95996 4.94939 6.66 5.31941 6.66L9.33941 6.66Z" />
    </svg>
  );
}

function ToolbarIconFit() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path d="M1.3252 5.345L1.3252 3.335C1.3252 2.80191 1.53712 2.29082 1.91407 1.91387C2.29101 1.53692 2.80211 1.325 3.3352 1.325L5.3452 1.325C5.71522 1.325 6.0152 1.62497 6.0152 1.995C6.0152 2.36502 5.71522 2.665 5.3452 2.665L3.3352 2.665C3.1575 2.665 2.98714 2.73564 2.86149 2.86129C2.73583 2.98694 2.6652 3.1573 2.6652 3.335L2.6652 5.345C2.6652 5.71502 2.36522 6.015 1.9952 6.015C1.62517 6.015 1.3252 5.71502 1.3252 5.345Z" />
      <path d="M13.3354 5.345L13.3354 3.335C13.3354 3.1573 13.2647 2.98694 13.139 2.86129C13.0291 2.75131 12.8848 2.68347 12.7314 2.66827L12.6654 2.665L10.6554 2.665C10.2853 2.665 9.98535 2.36502 9.98535 1.995C9.98535 1.62497 10.2853 1.325 10.6554 1.325L12.6654 1.325L12.8643 1.33481C13.3243 1.38055 13.7567 1.58409 14.0865 1.91387C14.4634 2.29082 14.6754 2.80191 14.6754 3.335L14.6754 5.345C14.6754 5.71502 14.3754 6.015 14.0054 6.015C13.6353 6.015 13.3354 5.71502 13.3354 5.345Z" />
      <path d="M1.3252 12.665L1.3252 10.655C1.3252 10.285 1.62517 9.985 1.9952 9.985C2.36522 9.985 2.6652 10.285 2.6652 10.655L2.6652 12.665L2.66846 12.7311C2.68367 12.8845 2.75151 13.0287 2.86149 13.1387C2.98714 13.2644 3.1575 13.335 3.3352 13.335L5.3452 13.335C5.71522 13.335 6.0152 13.635 6.0152 14.005C6.0152 14.375 5.71522 14.675 5.3452 14.675L3.3352 14.675C2.80211 14.675 2.29101 14.4631 1.91407 14.0861C1.58429 13.7564 1.38075 13.3239 1.33501 12.8639L1.3252 12.665Z" />
      <path d="M13.3354 12.665L13.3354 10.655C13.3354 10.285 13.6353 9.985 14.0054 9.985C14.3754 9.985 14.6754 10.285 14.6754 10.655V12.665C14.6754 13.1981 14.4634 13.7092 14.0865 14.0861C13.7095 14.4631 13.1985 14.675 12.6654 14.675H10.6554C10.2853 14.675 9.98535 14.375 9.98535 14.005C9.98535 13.635 10.2853 13.335 10.6554 13.335L12.6654 13.335C12.843 13.335 13.0134 13.2644 13.139 13.1387C13.2647 13.0131 13.3354 12.8427 13.3354 12.665Z" />
    </svg>
  );
}

function ToolbarIconGrid() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M10 2.5C10 2.22386 9.77615 2 9.5 2L2.5 2C2.22386 2 2 2.22386 2 2.5L2 9.5C2 9.77615 2.22386 10 2.5 10L9.5 10C9.77615 10 10 9.77615 10 9.5L10 2.5ZM11 9.5C11 10.3285 10.3285 11 9.5 11L2.5 11C1.67158 11 1 10.3285 1 9.5L1 2.5C1 1.67158 1.67158 1 2.5 1L9.5 1C10.3285 1 11 1.67158 11 2.5L11 9.5Z" />
      <path d="M10.5 4C10.7761 4 11 4.22386 11 4.5C11 4.77614 10.7761 5 10.5 5L1.5 5C1.22386 5 1 4.77614 1 4.5C1 4.22386 1.22386 4 1.5 4L10.5 4Z" />
      <path d="M10.5 7C10.7761 7 11 7.22385 11 7.5C11 7.77615 10.7761 8 10.5 8L1.5 8C1.22386 8 1 7.77615 1 7.5C1 7.22385 1.22386 7 1.5 7L10.5 7Z" />
      <path d="M4 10.5L4 1.5C4 1.22386 4.22386 1 4.5 1C4.77614 1 5 1.22386 5 1.5L5 10.5C5 10.7761 4.77614 11 4.5 11C4.22386 11 4 10.7761 4 10.5Z" />
      <path d="M7 10.5L7 1.5C7 1.22386 7.22385 1 7.5 1C7.77615 1 8 1.22386 8 1.5L8 10.5C8 10.7761 7.77615 11 7.5 11C7.22385 11 7 10.7761 7 10.5Z" />
    </svg>
  );
}

function ToolbarIconSnap() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2.16101 1.50295C2.28682 1.48865 2.41422 1.50698 2.53162 1.55569L2.53211 1.5552L10.5321 4.8052L10.5863 4.82961C10.6913 4.88238 10.7825 4.95926 10.8524 5.05375L10.8856 5.10255L10.9149 5.15335C10.9783 5.275 11.0071 5.41225 10.9979 5.54985C10.9875 5.70705 10.9275 5.8572 10.827 5.97855C10.7266 6.0998 10.5903 6.1865 10.4379 6.2261H10.4374L7.37537 7.01615C7.28897 7.03835 7.20957 7.0835 7.14637 7.1465C7.08317 7.2096 7.03792 7.28855 7.01552 7.375L7.01502 7.37455L6.22597 10.437V10.438C6.18637 10.5904 6.09967 10.7267 5.97842 10.8271C5.85702 10.9276 5.70692 10.9876 5.54967 10.998C5.39252 11.0085 5.23602 10.9692 5.10242 10.8857C4.96881 10.8022 4.86451 10.6786 4.80506 10.5327L1.55506 2.53225L1.55555 2.53176C1.49967 2.39706 1.48379 2.24891 1.51111 2.10549L1.52381 2.0508C1.55779 1.92489 1.62399 1.8095 1.71668 1.71682L1.75818 1.67873C1.85704 1.59375 1.97666 1.5358 2.10535 1.51125L2.16101 1.50295ZM5.44617 9.4546L6.04727 7.12455L6.07557 7.02785C6.14917 6.8062 6.27387 6.60415 6.43982 6.4385C6.62937 6.2494 6.86612 6.1146 7.12537 6.0479L9.45447 5.4468L2.70398 2.70412L5.44617 9.4546Z" />
    </svg>
  );
}

function WorkspaceToolbar({
  unit,
  zoomPercent,
  canUndo,
  canRedo,
  isGridVisible,
  onSetUnit,
  onUndo,
  onRedo,
  onZoomOut,
  onZoomIn,
  onFitView,
  onToggleGrid,
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
          <ToolbarIconUndo />
        </button>
        <button
          type="button"
          className="tool-icon-button"
          aria-label="Redo"
          onClick={onRedo}
          disabled={!canRedo}
        >
          <ToolbarIconRedo />
        </button>

        <div className="tool-divider" />

        <button
          type="button"
          className="tool-icon-button"
          aria-label="Zoom out"
          onClick={onZoomOut}
        >
          <ToolbarIconZoomOut />
        </button>
        <span className="tool-zoom-value">{zoomPercent}%</span>
        <button
          type="button"
          className="tool-icon-button"
          aria-label="Zoom in"
          onClick={onZoomIn}
        >
          <ToolbarIconZoomIn />
        </button>
        <button
          type="button"
          className="tool-icon-button"
          aria-label="Fit room"
          onClick={onFitView}
        >
          <ToolbarIconFit />
        </button>

        <div className="tool-divider" />

        <div className="tool-unit-toggle" aria-label="Unit display">
          <button
            type="button"
            className={unit === "ft" ? "active" : ""}
            aria-pressed={unit === "ft"}
            onClick={() => onSetUnit("ft")}
          >
            FT
          </button>
          <button
            type="button"
            className={unit === "m" ? "active" : ""}
            aria-pressed={unit === "m"}
            onClick={() => onSetUnit("m")}
          >
            M
          </button>
        </div>

        <button
          type="button"
          className={`tool-pill ${isGridVisible ? "active" : ""}`}
          onClick={onToggleGrid}
        >
          <ToolbarIconGrid />
          Grid
        </button>
        <button
          type="button"
          className="tool-pill"
          disabled
          aria-label="Snap coming later"
        >
          <ToolbarIconSnap />
          Snap
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
  roomDimensions,
  unit,
  roomAppearance,
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
  onSetUnit,
}) {
  const roomOutlineRef = useRef(null);
  const roomViewportRef = useRef(null);
  const interactionRef = useRef(null);
  const cleanupInteractionRef = useRef(null);
  const [activeInteraction, setActiveInteraction] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [roomViewportSize, setRoomViewportSize] = useState({
    width: 760,
    height: 520,
  });
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
        isGridVisible={showGrid}
        onSetUnit={onSetUnit}
        onUndo={onUndo}
        onRedo={onRedo}
        onZoomOut={handleZoomOut}
        onZoomIn={handleZoomIn}
        onFitView={handleFitView}
        onToggleGrid={() => setShowGrid((currentValue) => !currentValue)}
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
                "--room-wall-color": roomAppearance.wallColor,
                "--room-floor-color": roomAppearance.floorColor,
                padding: `${ROOM_FRAME_PADDING_PX}px`,
              }}
            >
              <div
                ref={roomOutlineRef}
                className={`room-outline ${
                  showGrid ? "show-grid" : "hide-grid"
                } ${
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
          <span className="workspace-chip">
            {formatValue(roomDimensions.length)}
            {unit} x {formatValue(roomDimensions.width)}
            {unit} Room
          </span>
          <span className="workspace-chip">
            Grid {showGrid ? "On" : "Off"}
          </span>
          <span className="workspace-chip">{zoomPercent}% Zoom</span>
        </div>

        <div className="workspace-hint">
          Middle mouse pans. Arrow keys nudge. Switch between room and furniture
          editing in the properties panel.
        </div>
      </div>
    </section>
  );
}

function PropertiesPanel({
  unit,
  roomSetup,
  roomDimensions,
  roomAppearance,
  activeMode,
  minimumFurnitureSize,
  selectedItem,
  onUpdateSelectedItem,
  onUpdateRoomDimension,
  onUpdateRoomAppearance,
  onRemoveSelectedItem,
  onDuplicateSelectedItem,
  onDeselectItem,
}) {
  const [dimensionDrafts, setDimensionDrafts] = useState({});
  const [roomDimensionDrafts, setRoomDimensionDrafts] = useState({});

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
  const roomWidthDraft = roomDimensionDrafts.width ?? null;
  const roomHeightDraft = roomDimensionDrafts.length ?? null;
  const roomShapeLabel = formatShape(roomSetup?.shape);
  const isFurnitureMode = activeMode === "furniture" && selectedItem;

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

  const handleRoomDimensionDraftChange = (field, rawValue) => {
    if (!/^\d*\.?\d*$/.test(rawValue)) {
      return;
    }

    setRoomDimensionDrafts((previousDrafts) => ({
      ...previousDrafts,
      [field]: rawValue,
    }));

    if (rawValue !== "") {
      onUpdateRoomDimension(field, rawValue);
    }
  };

  const handleRoomDimensionDraftBlur = (field) => {
    const fallbackValue =
      field === "width" ? roomDimensions.width : roomDimensions.length;
    const rawValue = roomDimensionDrafts[field] ?? formatValue(fallbackValue, "");
    const normalizedValue = formatValue(
      coerceDimensionNumber(
        rawValue,
        fallbackValue,
        toUnitValue(1, unit),
        Number.POSITIVE_INFINITY,
      ),
      "",
    );

    setRoomDimensionDrafts((previousDrafts) => {
      const nextDrafts = { ...previousDrafts };
      delete nextDrafts[field];
      return nextDrafts;
    });

    onUpdateRoomDimension(field, normalizedValue);
  };

  return (
    <aside className="properties-panel">
      <div className="properties-header">
        <div className="properties-title-row">
          <span className="panel-leading-icon">
            <PanelIconSettings />
          </span>
          <h2>Properties</h2>
        </div>
        {isFurnitureMode ? (
          <button
            type="button"
            className="properties-header-button"
            onClick={onDeselectItem}
          >
            Deselect
          </button>
        ) : null}
      </div>

      {!isFurnitureMode ? (
        <>
          <div className="properties-item">
            <span className="properties-pill">Room</span>
            <h3>{roomAppearance.name}</h3>
            <p>
              {roomShapeLabel} in {formatValue(roomDimensions.width)}
              {unit} x {formatValue(roomDimensions.length)}
              {unit}
            </p>
          </div>

          <section className="properties-section">
            <h4>Room Details</h4>

            <div className="properties-two-col">
              <label className="properties-field" htmlFor="room-name-input">
                Room Label
                <input
                  id="room-name-input"
                  type="text"
                  value={roomAppearance.name}
                  onChange={(event) =>
                    onUpdateRoomAppearance("name", event.target.value)
                  }
                />
              </label>

              <div className="properties-readonly-card">
                <span>Shape</span>
                <strong>{roomShapeLabel}</strong>
              </div>
            </div>

            <div className="properties-two-col">
              <label className="properties-field" htmlFor="room-width-input">
                Width ({unit})
                <input
                  id="room-width-input"
                  type="text"
                  inputMode="decimal"
                  value={roomWidthDraft ?? formatValue(roomDimensions.width, "")}
                  onChange={(event) =>
                    handleRoomDimensionDraftChange("width", event.target.value)
                  }
                  onBlur={() => handleRoomDimensionDraftBlur("width")}
                />
              </label>
              <label className="properties-field" htmlFor="room-height-input">
                Height ({unit})
                <input
                  id="room-height-input"
                  type="text"
                  inputMode="decimal"
                  value={roomHeightDraft ?? formatValue(roomDimensions.length, "")}
                  onChange={(event) =>
                    handleRoomDimensionDraftChange("length", event.target.value)
                  }
                  onBlur={() => handleRoomDimensionDraftBlur("length")}
                />
              </label>
            </div>
          </section>

          <section className="properties-section">
            <h4>Room Appearance</h4>
            <div className="properties-subtitle-row">
              <p className="properties-subtitle">Wall colour</p>
              <span className="properties-color-chip">
                {roomAppearance.wallColor}
              </span>
            </div>

            <div className="swatch-row">
              {ROOM_WALL_SWATCHES.map((swatch) => (
                <button
                  key={swatch}
                  type="button"
                  className={`swatch ${roomAppearance.wallColor === swatch ? "active" : ""}`}
                  style={{ backgroundColor: swatch }}
                  onClick={() => onUpdateRoomAppearance("wallColor", swatch)}
                />
              ))}
              <InlineColorPickerButton
                value={roomAppearance.wallColor}
                isActive={!ROOM_WALL_SWATCHES.includes(roomAppearance.wallColor)}
                label="Choose custom wall colour"
                onChange={(color) => onUpdateRoomAppearance("wallColor", color)}
              />
            </div>

            <div className="properties-floor-card">
              <span>Floor colour</span>
              <div className="properties-floor-preview-row">
                <strong>Fixed neutral floor</strong>
                <span
                  className="properties-floor-swatch"
                  style={{ backgroundColor: roomAppearance.floorColor }}
                />
              </div>
            </div>
          </section>

          <section className="properties-section">
            <h4>Editing</h4>
            <p className="properties-note">
              Select a furniture item to switch into furniture mode and edit its
              transform and finish.
            </p>
          </section>
        </>
      ) : (
        <>
          <div className="properties-item">
            <span className="properties-pill">Furniture Item</span>
            <h3>{selectedItem.name}</h3>
          </div>

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
            <div className="properties-subtitle-row">
              <p className="properties-subtitle">Upholstery Color</p>
              <span className="properties-color-chip">{selectedItem.color}</span>
            </div>

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
              <InlineColorPickerButton
                value={selectedItem.color}
                isActive={!FINISH_SWATCHES.includes(selectedItem.color)}
                label="Choose custom upholstery color"
                onChange={(color) => onUpdateSelectedItem("color", color)}
              />
            </div>
          </section>
        </>
      )}

      <div className="properties-actions">
        {isFurnitureMode ? (
          <>
            <div className="properties-inline-actions">
              <button
                type="button"
                className="action-outline action-dashed"
                onClick={onDuplicateSelectedItem}
              >
                <PanelIconCopy />
                Duplicate
              </button>
              <button
                type="button"
                className="action-outline"
                disabled
              >
                <PanelIconLock />
                Lock
              </button>
            </div>
            <button
              type="button"
              className="action-danger"
              onClick={onRemoveSelectedItem}
            >
              <PanelIconTrash />
              Remove From Layout
            </button>
          </>
        ) : null}
        <button
          type="button"
          className="action-save"
          onClick={() => {}}
        >
          <PanelIconSave />
          Save Design
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
}) {
  const [unit, setUnit] = useState(() => getUnit(roomSetup));
  const [roomDimensions, setRoomDimensions] = useState(() =>
    getRoomDimensions(roomSetup, getUnit(roomSetup)),
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
  const [propertiesMode, setPropertiesMode] = useState("room");
  const [roomAppearance, setRoomAppearance] = useState(() => ({
    name: getDefaultRoomLabel(roomSetup),
    wallColor: DEFAULT_ROOM_WALL_COLOR,
    floorColor: DEFAULT_ROOM_FLOOR_COLOR,
  }));
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

  const handleSelectItem = useCallback((itemId) => {
    setSelectedItemId(itemId);
    setPropertiesMode("furniture");
  }, []);

  const handleDeselectItem = useCallback(() => {
    setSelectedItemId(null);
    setPropertiesMode("room");
  }, []);

  const handleUpdateRoomAppearance = useCallback((field, rawValue) => {
    setRoomAppearance((previousRoomAppearance) => {
      if (field === "name") {
        return {
          ...previousRoomAppearance,
          name: rawValue.slice(0, 40) || "Design Room",
        };
      }

      if (field === "wallColor") {
        return {
          ...previousRoomAppearance,
          wallColor: sanitizeColor(rawValue, previousRoomAppearance.wallColor),
        };
      }

      return previousRoomAppearance;
    });
  }, []);

  const handleUpdateRoomDimension = useCallback(
    (field, rawValue) => {
      const nextDimensions = {
        ...roomDimensions,
        [field]: coerceDimensionNumber(
          rawValue,
          roomDimensions[field],
          toUnitValue(1, unit),
          Number.POSITIVE_INFINITY,
        ),
      };

      setRoomDimensions(nextDimensions);
      setPlacedItems((previousItems) => clampItemsToRoom(previousItems, nextDimensions));
    },
    [roomDimensions, unit],
  );

  const handleChangeUnit = useCallback(
    (nextUnit) => {
      if (nextUnit === unit) {
        return;
      }

      const nextRoomDimensions = {
        width: convertUnitValue(roomDimensions.width, unit, nextUnit),
        length: convertUnitValue(roomDimensions.length, unit, nextUnit),
      };

      setPlacedItems((previousItems) =>
        clampItemsToRoom(
          previousItems.map((item) => ({
            ...item,
            width: convertUnitValue(item.width, unit, nextUnit),
            height: convertUnitValue(item.height, unit, nextUnit),
            x: convertUnitValue(item.x, unit, nextUnit),
            y: convertUnitValue(item.y, unit, nextUnit),
          })),
          nextRoomDimensions,
        ),
      );

      if (clipboardRef.current) {
        clipboardRef.current = {
          ...clipboardRef.current,
          width: convertUnitValue(clipboardRef.current.width, unit, nextUnit),
          height: convertUnitValue(clipboardRef.current.height, unit, nextUnit),
          x: convertUnitValue(clipboardRef.current.x, unit, nextUnit),
          y: convertUnitValue(clipboardRef.current.y, unit, nextUnit),
        };
      }

      setHistoryStack([]);
      setRedoStack([]);
      setRoomDimensions(nextRoomDimensions);
      setUnit(nextUnit);
    },
    [roomDimensions, unit],
  );

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
    setPropertiesMode(previousSnapshot.selectedItemId ? "furniture" : "room");
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
    setPropertiesMode(nextSnapshot.selectedItemId ? "furniture" : "room");
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
    handleSelectItem(boundedItem.id);
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
    handleDeselectItem();
  }, [handleDeselectItem, recordHistorySnapshot, selectedItemId]);

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

  const handleDuplicateSelectedItem = useCallback(() => {
    if (!selectedItem) {
      return;
    }

    recordHistorySnapshot();
    const duplicatedItem = getPastedItem(selectedItem, roomDimensions, unit);
    setPlacedItems((previousItems) => [...previousItems, duplicatedItem]);
    handleSelectItem(duplicatedItem.id);
  }, [handleSelectItem, recordHistorySnapshot, roomDimensions, selectedItem, unit]);

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
    handleSelectItem(pastedItem.id);
  }, [handleSelectItem, recordHistorySnapshot, roomDimensions, unit]);

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
            roomDimensions={roomDimensions}
            unit={unit}
            roomAppearance={roomAppearance}
            placedItems={placedItems}
            selectedItemId={selectedItemId}
            onSelectItem={handleSelectItem}
            onDeselectItem={handleDeselectItem}
            onBeginSceneAction={recordHistorySnapshot}
            onMoveItem={handleMoveItem}
            onResizeItem={handleResizeItem}
            onRotateItem={handleRotateItem}
            onUndo={handleUndo}
            onRedo={handleRedo}
            canUndo={historyStack.length > 0}
            canRedo={redoStack.length > 0}
            onSetUnit={handleChangeUnit}
          />

          <PropertiesPanel
            unit={unit}
            roomSetup={roomSetup}
            roomDimensions={roomDimensions}
            roomAppearance={roomAppearance}
            activeMode={propertiesMode}
            minimumFurnitureSize={minimumFurnitureSize}
            selectedItem={selectedItem}
            onUpdateSelectedItem={handleUpdateSelectedItem}
            onUpdateRoomDimension={handleUpdateRoomDimension}
            onUpdateRoomAppearance={handleUpdateRoomAppearance}
            onRemoveSelectedItem={handleRemoveSelectedItem}
            onDuplicateSelectedItem={handleDuplicateSelectedItem}
            onDeselectItem={handleDeselectItem}
          />
        </section>

        <footer className="designer-footer">
          <span>&copy; 2026 FurnitureViz</span>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </footer>
      </main>

    </div>
  );
}

export default RoomDesignerPage;
