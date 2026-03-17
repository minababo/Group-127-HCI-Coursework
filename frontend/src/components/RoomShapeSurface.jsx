import { forwardRef } from "react";
import { getRoomShapeClipPath, normalizeRoomShape } from "../utils/roomShape";
import "./RoomShapeSurface.css";

const RoomShapeSurface = forwardRef(function RoomShapeSurface(
  { shape, className = "", style, children, ...props },
  ref,
) {
  const normalizedShape = normalizeRoomShape(shape);
  const nextStyle =
    normalizedShape === "l-shape"
      ? {
          ...style,
          "--room-shape-clip": getRoomShapeClipPath(normalizedShape),
        }
      : style;

  return (
    <div
      ref={ref}
      className={`room-shape-surface is-${normalizedShape} ${className}`.trim()}
      style={nextStyle}
      {...props}
    >
      {children}
    </div>
  );
});

export default RoomShapeSurface;
