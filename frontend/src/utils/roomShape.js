const L_SHAPE_SPLIT_X_RATIO = 0.62;
const L_SHAPE_SPLIT_Y_RATIO = 0.58;

function roundToTwo(value) {
  return Math.round(Number(value) * 100) / 100;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getAxisBounds(size, start, span) {
  if (size <= span) {
    return {
      min: start,
      max: start + span - size,
    };
  }

  return {
    min: start + span - size,
    max: start,
  };
}

function clampToAxis(value, size, start, span) {
  const bounds = getAxisBounds(size, start, span);
  return clamp(value, bounds.min, bounds.max);
}

function rectsIntersect(left, right) {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function normalizeRoomShape(shape) {
  return shape === "l-shape" ? "l-shape" : "rectangle";
}

export function getRoomShapeLabel(shape) {
  return normalizeRoomShape(shape) === "l-shape"
    ? "L-Shaped Room"
    : "Rectangle / Square";
}

export function getRoomShapeClipPath(shape) {
  if (normalizeRoomShape(shape) !== "l-shape") {
    return "none";
  }

  return `polygon(0% 0%, ${L_SHAPE_SPLIT_X_RATIO * 100}% 0%, ${
    L_SHAPE_SPLIT_X_RATIO * 100
  }% ${L_SHAPE_SPLIT_Y_RATIO * 100}%, 100% ${
    L_SHAPE_SPLIT_Y_RATIO * 100
  }%, 100% 100%, 0% 100%)`;
}

export function getLShapeMetrics(roomDimensions) {
  const width = Math.max(Number(roomDimensions?.width) || 0, 0);
  const length = Math.max(Number(roomDimensions?.length) || 0, 0);
  const splitX = roundToTwo(width * L_SHAPE_SPLIT_X_RATIO);
  const splitY = roundToTwo(length * L_SHAPE_SPLIT_Y_RATIO);

  return {
    splitX,
    splitY,
    cutout: {
      x: splitX,
      y: 0,
      width: Math.max(0, width - splitX),
      height: splitY,
    },
    regions: [
      {
        id: "left-band",
        x: 0,
        y: 0,
        width: splitX,
        height: length,
      },
      {
        id: "bottom-band",
        x: 0,
        y: splitY,
        width,
        height: Math.max(0, length - splitY),
      },
    ],
  };
}

export function constrainItemToRoomShape(item, roomDimensions, roomShape) {
  const width = Math.max(Number(roomDimensions?.width) || 0, 0);
  const length = Math.max(Number(roomDimensions?.length) || 0, 0);

  const clampedItem = {
    ...item,
    x: roundToTwo(clampToAxis(item.x, item.width, 0, width)),
    y: roundToTwo(clampToAxis(item.y, item.height, 0, length)),
  };

  if (normalizeRoomShape(roomShape) !== "l-shape") {
    return clampedItem;
  }

  const itemRect = {
    x: clampedItem.x,
    y: clampedItem.y,
    width: clampedItem.width,
    height: clampedItem.height,
  };
  const metrics = getLShapeMetrics(roomDimensions);

  if (!rectsIntersect(itemRect, metrics.cutout)) {
    return clampedItem;
  }

  const candidates = metrics.regions
    .filter(
      (region) =>
        clampedItem.width <= region.width && clampedItem.height <= region.height,
    )
    .map((region) => ({
      ...clampedItem,
      x: roundToTwo(
        clampToAxis(clampedItem.x, clampedItem.width, region.x, region.width),
      ),
      y: roundToTwo(
        clampToAxis(clampedItem.y, clampedItem.height, region.y, region.height),
      ),
    }));

  if (candidates.length === 0) {
    return clampedItem;
  }

  return candidates.reduce((closestItem, candidate) => {
    const closestDistance =
      (closestItem.x - clampedItem.x) ** 2 + (closestItem.y - clampedItem.y) ** 2;
    const candidateDistance =
      (candidate.x - clampedItem.x) ** 2 + (candidate.y - clampedItem.y) ** 2;

    return candidateDistance < closestDistance ? candidate : closestItem;
  });
}

export function constrainItemsToRoomShape(items, roomDimensions, roomShape) {
  return items.map((item) =>
    constrainItemToRoomShape(item, roomDimensions, roomShape),
  );
}
