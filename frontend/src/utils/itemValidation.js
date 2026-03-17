import { getLShapeMetrics, normalizeRoomShape } from "./roomShape";

const EPSILON = 0.0001;

function roundToTwo(value) {
  return Math.round(Number(value) * 100) / 100;
}

function toRadians(angle) {
  return (Number(angle) * Math.PI) / 180;
}

function createRectPolygon(x, y, width, height) {
  return [
    { x, y },
    { x: x + width, y },
    { x: x + width, y: y + height },
    { x, y: y + height },
  ];
}

function dotProduct(left, right) {
  return left.x * right.x + left.y * right.y;
}

function getPolygonAxes(points) {
  return points.map((point, index) => {
    const nextPoint = points[(index + 1) % points.length];
    const edge = {
      x: nextPoint.x - point.x,
      y: nextPoint.y - point.y,
    };
    const axis = {
      x: -edge.y,
      y: edge.x,
    };
    const length = Math.hypot(axis.x, axis.y) || 1;

    return {
      x: axis.x / length,
      y: axis.y / length,
    };
  });
}

function projectPolygon(points, axis) {
  const values = points.map((point) => dotProduct(point, axis));

  return {
    min: Math.min(...values),
    max: Math.max(...values),
  };
}

function isPointWithinOuterBounds(point, roomDimensions) {
  const roomWidth = Math.max(Number(roomDimensions?.width) || 0, 0);
  const roomLength = Math.max(Number(roomDimensions?.length) || 0, 0);

  return (
    point.x >= -EPSILON &&
    point.x <= roomWidth + EPSILON &&
    point.y >= -EPSILON &&
    point.y <= roomLength + EPSILON
  );
}

function isFootprintWithinOuterRoom(footprint, roomDimensions) {
  return footprint.every((point) => isPointWithinOuterBounds(point, roomDimensions));
}

function isFootprintWithinRoomShape(footprint, roomDimensions, roomShape) {
  if (!isFootprintWithinOuterRoom(footprint, roomDimensions)) {
    return false;
  }

  if (normalizeRoomShape(roomShape) !== "l-shape") {
    return true;
  }

  const { cutout } = getLShapeMetrics(roomDimensions);
  if (cutout.width <= 0 || cutout.height <= 0) {
    return true;
  }

  return !polygonsOverlap(
    footprint,
    createRectPolygon(cutout.x, cutout.y, cutout.width, cutout.height),
  );
}

export function getItemFootprint(item) {
  const width = Math.max(Number(item?.width) || 0, 0);
  const height = Math.max(Number(item?.height) || 0, 0);
  const rotation = toRadians(Number(item?.rotation) || 0);
  const centerX = (Number(item?.x) || 0) + width / 2;
  const centerY = (Number(item?.y) || 0) + height / 2;
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);

  return [
    { x: -halfWidth, y: -halfHeight },
    { x: halfWidth, y: -halfHeight },
    { x: halfWidth, y: halfHeight },
    { x: -halfWidth, y: halfHeight },
  ].map((point) => ({
    x: roundToTwo(centerX + point.x * cosine - point.y * sine),
    y: roundToTwo(centerY + point.x * sine + point.y * cosine),
  }));
}

export function getPolygonBounds(points) {
  const xValues = points.map((point) => point.x);
  const yValues = points.map((point) => point.y);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const minY = Math.min(...yValues);
  const maxY = Math.max(...yValues);

  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

export function polygonsOverlap(leftPoints, rightPoints) {
  const axes = [...getPolygonAxes(leftPoints), ...getPolygonAxes(rightPoints)];

  return axes.every((axis) => {
    const leftProjection = projectPolygon(leftPoints, axis);
    const rightProjection = projectPolygon(rightPoints, axis);

    return (
      leftProjection.max > rightProjection.min + EPSILON &&
      rightProjection.max > leftProjection.min + EPSILON
    );
  });
}

export function clampItemToRoomBounds(item, roomDimensions) {
  const roomWidth = Math.max(Number(roomDimensions?.width) || 0, 0);
  const roomLength = Math.max(Number(roomDimensions?.length) || 0, 0);
  const footprintBounds = getPolygonBounds(getItemFootprint(item));
  let shiftX = 0;
  let shiftY = 0;

  if (footprintBounds.width <= roomWidth + EPSILON) {
    if (footprintBounds.minX < 0) {
      shiftX = -footprintBounds.minX;
    } else if (footprintBounds.maxX > roomWidth) {
      shiftX = roomWidth - footprintBounds.maxX;
    }
  } else {
    shiftX = roomWidth / 2 - (footprintBounds.minX + footprintBounds.maxX) / 2;
  }

  if (footprintBounds.height <= roomLength + EPSILON) {
    if (footprintBounds.minY < 0) {
      shiftY = -footprintBounds.minY;
    } else if (footprintBounds.maxY > roomLength) {
      shiftY = roomLength - footprintBounds.maxY;
    }
  } else {
    shiftY =
      roomLength / 2 - (footprintBounds.minY + footprintBounds.maxY) / 2;
  }

  return {
    ...item,
    x: roundToTwo((Number(item?.x) || 0) + shiftX),
    y: roundToTwo((Number(item?.y) || 0) + shiftY),
  };
}

export function validateItemPlacement(
  item,
  otherItems,
  roomDimensions,
  roomShape,
) {
  const footprint = getItemFootprint(item);
  const overlappingItemIds = otherItems
    .filter((otherItem) =>
      polygonsOverlap(footprint, getItemFootprint(otherItem)),
    )
    .map((otherItem) => otherItem.id);
  const isWithinBounds = isFootprintWithinRoomShape(
    footprint,
    roomDimensions,
    roomShape,
  );

  return {
    isWithinBounds,
    overlappingItemIds,
    isColliding: overlappingItemIds.length > 0,
    isValid: isWithinBounds && overlappingItemIds.length === 0,
  };
}

export function validateFurnitureLayout(items, roomDimensions, roomShape) {
  const itemEntries = items.map((item) => ({
    item,
    footprint: getItemFootprint(item),
  }));
  const byId = Object.fromEntries(
    itemEntries.map(({ item, footprint }) => [
      item.id,
      {
        isWithinBounds: isFootprintWithinRoomShape(
          footprint,
          roomDimensions,
          roomShape,
        ),
        overlappingItemIds: [],
        isColliding: false,
        isValid: false,
      },
    ]),
  );

  for (let leftIndex = 0; leftIndex < itemEntries.length; leftIndex += 1) {
    for (
      let rightIndex = leftIndex + 1;
      rightIndex < itemEntries.length;
      rightIndex += 1
    ) {
      const leftEntry = itemEntries[leftIndex];
      const rightEntry = itemEntries[rightIndex];

      if (!polygonsOverlap(leftEntry.footprint, rightEntry.footprint)) {
        continue;
      }

      byId[leftEntry.item.id].overlappingItemIds.push(rightEntry.item.id);
      byId[rightEntry.item.id].overlappingItemIds.push(leftEntry.item.id);
    }
  }

  const invalidItemIds = [];

  Object.entries(byId).forEach(([itemId, validation]) => {
    validation.isColliding = validation.overlappingItemIds.length > 0;
    validation.isValid = validation.isWithinBounds && !validation.isColliding;

    if (!validation.isValid) {
      invalidItemIds.push(itemId);
    }
  });

  return {
    byId,
    invalidItemIds,
    isValid: invalidItemIds.length === 0,
  };
}
