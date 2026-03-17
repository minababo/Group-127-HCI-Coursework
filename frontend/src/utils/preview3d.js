import {
  getLShapeMetrics,
  getRoomShapeLabel,
  normalizeRoomShape,
} from './roomShape'

const FEET_TO_METERS = 0.3048
const DEFAULT_ROOM_WIDTH_FT = 16
const DEFAULT_ROOM_LENGTH_FT = 12
const DEFAULT_WALL_COLOR = '#DCE7F5'
const DEFAULT_FLOOR_COLOR = '#F8FAFC'

function roundToThree(value) {
  return Math.round(Number(value) * 1000) / 1000
}

function roundToTwo(value) {
  return Math.round(Number(value) * 100) / 100
}

function sanitizeColor(value, fallback) {
  if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value.trim())) {
    return value.trim()
  }

  return fallback
}

function toMeters(value, unit) {
  if (!Number.isFinite(Number(value))) {
    return 0
  }

  if (unit === 'ft') {
    return roundToThree(Number(value) * FEET_TO_METERS)
  }

  return roundToThree(Number(value))
}

function toDisplayDistance(value, fallbackFeet, unit) {
  const numericValue = Number(value)

  if (Number.isFinite(numericValue) && numericValue > 0) {
    return roundToTwo(numericValue)
  }

  return unit === 'm'
    ? roundToTwo(fallbackFeet * FEET_TO_METERS)
    : roundToTwo(fallbackFeet)
}

function getFurnitureMeshHeight(type) {
  switch (type) {
    case 'Chair':
      return 1.0
    case 'Sofa':
      return 0.9
    case 'Table':
      return 0.85
    case 'Desk':
      return 0.85
    case 'Bed':
      return 0.65
    case 'Lamp':
      return 1.7
    case 'Storage':
      return 1.4
    default:
      return 0.9
  }
}

function getRoomOutlinePoints(room) {
  if (room.shape !== 'l-shape') {
    return [
      { x: 0, z: 0 },
      { x: room.width, z: 0 },
      { x: room.width, z: room.length },
      { x: 0, z: room.length },
    ]
  }

  const metrics = getLShapeMetrics({
    width: room.width,
    length: room.length,
  })

  return [
    { x: 0, z: 0 },
    { x: room.width, z: 0 },
    { x: room.width, z: metrics.splitY },
    { x: metrics.splitX, z: metrics.splitY },
    { x: metrics.splitX, z: room.length },
    { x: 0, z: room.length },
  ]
}

export function formatPreviewDistance(value, unit) {
  const roundedValue = roundToTwo(value)

  if (!Number.isFinite(roundedValue)) {
    return `0${unit}`
  }

  return `${String(roundedValue).replace(/\.?0+$/, '')}${unit}`
}

export function getPreviewSceneData(design) {
  const room = design?.room ?? {}
  const unit = room.unit === 'm' ? 'm' : 'ft'
  const displayWidth = toDisplayDistance(room.width, DEFAULT_ROOM_WIDTH_FT, unit)
  const displayLength = toDisplayDistance(room.length, DEFAULT_ROOM_LENGTH_FT, unit)
  const width = toMeters(displayWidth, unit)
  const length = toMeters(displayLength, unit)
  const wallHeight = roundToThree(
    Math.min(Math.max(Math.max(width, length) * 0.48, 2.4), 3.6),
  )
  const wallThickness = 0.12
  const normalizedRoom = {
    name:
      typeof room.name === 'string' && room.name.trim()
        ? room.name.trim()
        : 'Design Room',
    shape: normalizeRoomShape(room.shape),
    shapeLabel: getRoomShapeLabel(room.shape),
    unit,
    displayWidth,
    displayLength,
    width,
    length,
    wallColor: sanitizeColor(room.wallColor, DEFAULT_WALL_COLOR),
    floorColor: sanitizeColor(room.floorColor, DEFAULT_FLOOR_COLOR),
    wallHeight,
    wallThickness,
  }

  const furniture = Array.isArray(design?.items)
    ? design.items.map((item, index) => {
        const itemWidth = Math.max(toMeters(item?.width, unit), 0.2)
        const itemDepth = Math.max(toMeters(item?.height, unit), 0.2)
        const x = toMeters(item?.x, unit)
        const z = toMeters(item?.y, unit)
        const meshHeight = getFurnitureMeshHeight(item?.type)

        return {
          id:
            typeof item?.id === 'string' && item.id.trim()
              ? item.id
              : `preview-item-${index + 1}`,
          name:
            typeof item?.name === 'string' && item.name.trim()
              ? item.name.trim()
              : 'Furniture Item',
          type:
            typeof item?.type === 'string' && item.type.trim()
              ? item.type.trim()
              : 'Furniture',
          color: sanitizeColor(item?.color, '#4F46E5'),
          width: itemWidth,
          depth: itemDepth,
          meshHeight,
          displayWidth: toDisplayDistance(item?.width, 1, unit),
          displayDepth: toDisplayDistance(item?.height, 1, unit),
          position: {
            x: roundToThree(x + itemWidth / 2 - width / 2),
            y: roundToThree(meshHeight / 2),
            z: roundToThree(z + itemDepth / 2 - length / 2),
          },
          rotationY: roundToThree((-Number(item?.rotation || 0) * Math.PI) / 180),
        }
      })
    : []

  return {
    room: normalizedRoom,
    furniture,
  }
}

export function getRoomFloorOutline(room) {
  return getRoomOutlinePoints(room)
}

export function getRoomWallSegments(room) {
  const outline = getRoomOutlinePoints(room)

  return outline.map((startPoint, index) => {
    const endPoint = outline[(index + 1) % outline.length]
    const deltaX = endPoint.x - startPoint.x
    const deltaZ = endPoint.z - startPoint.z

    return {
      id: `wall-${index + 1}`,
      length: roundToThree(Math.hypot(deltaX, deltaZ)),
      centerX: roundToThree((startPoint.x + endPoint.x) / 2 - room.width / 2),
      centerZ: roundToThree((startPoint.z + endPoint.z) / 2 - room.length / 2),
      rotationY: roundToThree(-Math.atan2(deltaZ, deltaX)),
    }
  })
}
