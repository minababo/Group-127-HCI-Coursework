import RoomShapeSurface from "./RoomShapeSurface";

function RoomShapePreview({
  shape,
  wallColor,
  className = "",
  surfaceClassName = "",
  gridClassName = "",
  children,
}) {
  return (
    <div className={className}>
      <RoomShapeSurface
        shape={shape}
        className={surfaceClassName}
        style={{ "--room-shape-wall-color": wallColor }}
      >
        {gridClassName ? <div className={gridClassName} /> : null}
        {children}
      </RoomShapeSurface>
    </div>
  );
}

export default RoomShapePreview;
