const STORAGE_KEY = "furnitureviz.saved-designs.v1";

function canUseLocalStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

function roundToTwo(value) {
  return Math.round(Number(value) * 100) / 100;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `design-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeRoom(design) {
  const room = design?.room ?? {};

  return {
    name:
      typeof room.name === "string" && room.name.trim()
        ? room.name.trim()
        : "Design Room",
    shape: room.shape === "l-shape" ? "l-shape" : "rectangle",
    unit: room.unit === "m" ? "m" : "ft",
    width: Number.isFinite(Number(room.width)) ? roundToTwo(room.width) : 0,
    length: Number.isFinite(Number(room.length)) ? roundToTwo(room.length) : 0,
    wallColor:
      typeof room.wallColor === "string" && room.wallColor.trim()
        ? room.wallColor
        : "#DCE7F5",
    floorColor:
      typeof room.floorColor === "string" && room.floorColor.trim()
        ? room.floorColor
        : "#F8FAFC",
  };
}

function normalizeItem(item, index) {
  return {
    id:
      typeof item?.id === "string" && item.id.trim()
        ? item.id
        : `item-${index + 1}`,
    type:
      typeof item?.type === "string" && item.type.trim() ? item.type : "Furniture",
    name:
      typeof item?.name === "string" && item.name.trim()
        ? item.name
        : "Furniture Item",
    width: Number.isFinite(Number(item?.width)) ? roundToTwo(item.width) : 0,
    height: Number.isFinite(Number(item?.height)) ? roundToTwo(item.height) : 0,
    x: Number.isFinite(Number(item?.x)) ? roundToTwo(item.x) : 0,
    y: Number.isFinite(Number(item?.y)) ? roundToTwo(item.y) : 0,
    rotation: Number.isFinite(Number(item?.rotation))
      ? Math.round(item.rotation)
      : 0,
    color:
      typeof item?.color === "string" && item.color.trim()
        ? item.color
        : "#4F46E5",
  };
}

function normalizeDesign(design) {
  if (!design || typeof design !== "object") {
    return null;
  }

  const normalizedRoom = normalizeRoom(design);
  const items = Array.isArray(design.items)
    ? design.items.map(normalizeItem).filter(Boolean)
    : [];
  const createdAt = Number.isFinite(Number(design.createdAt))
    ? Number(design.createdAt)
    : Date.now();
  const updatedAt = Number.isFinite(Number(design.updatedAt))
    ? Number(design.updatedAt)
    : createdAt;

  return {
    id:
      typeof design.id === "string" && design.id.trim() ? design.id : createId(),
    name:
      typeof design.name === "string" && design.name.trim()
        ? design.name.trim()
        : "Untitled Design",
    room: normalizedRoom,
    items,
    furnitureCount: items.length,
    owner:
      typeof design.owner === "string" && design.owner.trim()
        ? design.owner.trim()
        : null,
    createdAt,
    updatedAt,
  };
}

function writeSavedDesigns(designs) {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
}

export function loadSavedDesigns() {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue);
    if (!Array.isArray(parsedValue)) {
      return [];
    }

    return parsedValue
      .map(normalizeDesign)
      .filter(Boolean)
      .sort((left, right) => right.updatedAt - left.updatedAt);
  } catch {
    return [];
  }
}

export function getSavedDesignById(designId) {
  if (!designId) {
    return null;
  }

  return loadSavedDesigns().find((design) => design.id === designId) ?? null;
}

export function saveDesignSnapshot(snapshot) {
  const savedDesigns = loadSavedDesigns();
  const now = Date.now();
  const existingDesign = snapshot?.id
    ? savedDesigns.find((design) => design.id === snapshot.id)
    : null;
  const designId = existingDesign?.id ?? snapshot?.id ?? createId();
  const createdAt = existingDesign?.createdAt ?? now;

  const nextDesign = normalizeDesign({
    id: designId,
    name: snapshot?.name,
    owner: snapshot?.owner,
    room: {
      name: snapshot?.roomAppearance?.name,
      shape: snapshot?.roomSetup?.shape,
      unit: snapshot?.unit,
      width: snapshot?.roomDimensions?.width,
      length: snapshot?.roomDimensions?.length,
      wallColor: snapshot?.roomAppearance?.wallColor,
      floorColor: snapshot?.roomAppearance?.floorColor,
    },
    items: snapshot?.placedItems,
    createdAt,
    updatedAt: now,
  });

  const nextDesigns = savedDesigns.filter((design) => design.id !== designId);
  nextDesigns.unshift(nextDesign);
  writeSavedDesigns(nextDesigns);

  return nextDesign;
}

export function deleteSavedDesign(designId) {
  if (!designId) {
    return;
  }

  const nextDesigns = loadSavedDesigns().filter((design) => design.id !== designId);
  writeSavedDesigns(nextDesigns);
}

export function mapDesignToRoomSetup(design) {
  if (!design) {
    return null;
  }

  return {
    name: design.room.name,
    shape: design.room.shape,
    width: design.room.width,
    length: design.room.length,
    unit: design.room.unit,
    wallColor: design.room.wallColor,
  };
}
