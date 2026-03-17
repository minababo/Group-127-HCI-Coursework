import { useEffect, useMemo, useState } from "react";
import AppTopNav from "./AppTopNav";
import RoomShapePreview from "./RoomShapePreview";
import {
  canCreateBlankDesigns,
  getAccountDisplayName,
  getAccountRole,
} from "../utils/account";
import { getDesignPermissions } from "../utils/designStorage";
import { getRoomShapeLabel } from "../utils/roomShape";
import "./DashboardPage.css";

const MAX_RECENT_DESIGNS = 3;
const MAX_PREVIEW_ITEMS = 6;

function PlusIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M15.81 9.17a.83.83 0 1 1 0 1.66H4.19a.83.83 0 1 1 0-1.66h11.62Z"
      />
      <path
        fill="currentColor"
        d="M9.17 15.81V4.19a.83.83 0 1 1 1.66 0v11.62a.83.83 0 1 1-1.66 0Z"
      />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5.52 3.51a.67.67 0 0 1 .95 0l4.02 4.02a.67.67 0 0 1 0 .95l-4.02 4.02a.67.67 0 0 1-.95-.95L9.06 8 5.52 4.45a.67.67 0 0 1 0-.94Z"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10.62 10.62a.67.67 0 0 1 .95 0l2.91 2.91a.67.67 0 0 1-.95.95l-2.91-2.91a.67.67 0 0 1 0-.95Z"
      />
      <path
        fill="currentColor"
        d="M12.02 7.33A4.69 4.69 0 1 0 2.64 7.33a4.69 4.69 0 0 0 9.38 0Zm1.34 0a6.03 6.03 0 1 1-12.06 0 6.03 6.03 0 0 1 12.06 0Z"
      />
    </svg>
  );
}

function GridViewIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M3 3v3.75h3.75V3H3Zm5.25 3.75A1.5 1.5 0 0 1 6.75 8.25H3a1.5 1.5 0 0 1-1.5-1.5V3A1.5 1.5 0 0 1 3 1.5h3.75A1.5 1.5 0 0 1 8.25 3v3.75Z"
      />
      <path
        fill="currentColor"
        d="M11.25 3v3.75H15V3h-3.75Zm5.25 3.75a1.5 1.5 0 0 1-1.5 1.5h-3.75a1.5 1.5 0 0 1-1.5-1.5V3a1.5 1.5 0 0 1 1.5-1.5H15A1.5 1.5 0 0 1 16.5 3v3.75Z"
      />
      <path
        fill="currentColor"
        d="M11.25 11.25V15H15v-3.75h-3.75Zm5.25 3.75a1.5 1.5 0 0 1-1.5 1.5h-3.75a1.5 1.5 0 0 1-1.5-1.5v-3.75a1.5 1.5 0 0 1 1.5-1.5H15a1.5 1.5 0 0 1 1.5 1.5V15Z"
      />
      <path
        fill="currentColor"
        d="M3 11.25V15h3.75v-3.75H3ZM8.25 15a1.5 1.5 0 0 1-1.5 1.5H3A1.5 1.5 0 0 1 1.5 15v-3.75A1.5 1.5 0 0 1 3 9.75h3.75a1.5 1.5 0 0 1 1.5 1.5V15Z"
      />
    </svg>
  );
}

function ListViewIcon() {
  return (
    <svg viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.25 8.25h.01a.75.75 0 0 1 0 1.5h-.01a.75.75 0 0 1 0-1.5Z"
      />
      <path
        fill="currentColor"
        d="M2.25 12.75h.01a.75.75 0 0 1 0 1.5h-.01a.75.75 0 0 1 0-1.5Z"
      />
      <path
        fill="currentColor"
        d="M2.25 3.75h.01a.75.75 0 0 1 0 1.5h-.01a.75.75 0 0 1 0-1.5Z"
      />
      <path
        fill="currentColor"
        d="M15.75 8.25a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5h9.75Z"
      />
      <path
        fill="currentColor"
        d="M15.75 12.75a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5h9.75Z"
      />
      <path
        fill="currentColor"
        d="M15.75 3.75a.75.75 0 0 1 0 1.5H6a.75.75 0 0 1 0-1.5h9.75Z"
      />
    </svg>
  );
}

function RoomIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.64 4.02c0-.74.6-1.34 1.34-1.34h8.04c.74 0 1.34.6 1.34 1.34v8.04c0 .74-.6 1.34-1.34 1.34H3.98c-.74 0-1.34-.6-1.34-1.34V4.02Zm1.34 0v8.04h3.35V8.04H3.98Zm4.69 8.04h3.35V3.98H8.67v8.04Z"
      />
      <path
        fill="currentColor"
        d="M14.03 6.66a.67.67 0 1 1 0 1.34H1.97a.67.67 0 1 1 0-1.34h12.06Z"
      />
    </svg>
  );
}

function OpenIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M11.66 5.24V2.34H8.76a.58.58 0 1 1 0-1.16h3.48a.58.58 0 0 1 .58.58v3.48a.58.58 0 1 1-1.16 0Z"
      />
      <path
        fill="currentColor"
        d="M11.82 1.36a.58.58 0 0 1 .82.82L6.26 8.56a.58.58 0 1 1-.82-.82l6.38-6.38Z"
      />
      <path
        fill="currentColor"
        d="M1.2 11.07V4.69c0-.96.78-1.74 1.74-1.74h3.48a.58.58 0 1 1 0 1.16H2.94a.58.58 0 0 0-.58.58v6.38c0 .32.26.58.58.58h6.38a.58.58 0 0 0 .58-.58V7.59a.58.58 0 1 1 1.16 0v3.48c0 .96-.78 1.74-1.74 1.74H2.94c-.96 0-1.74-.78-1.74-1.74Z"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.22 2.92a.58.58 0 1 1 0 1.16H1.78a.58.58 0 1 1 0-1.16h10.44Z"
      />
      <path
        fill="currentColor"
        d="M2.36 11.65v-8.12a.58.58 0 0 1 1.16 0v8.12c0 .1.06.25.19.39.14.14.29.19.39.19H9.9c.1 0 .25-.05.39-.19.14-.14.19-.29.19-.39V3.53a.58.58 0 0 1 1.16 0v8.12c0 .48-.23.91-.53 1.21-.3.3-.73.53-1.21.53H4.1c-.48 0-.91-.23-1.21-.53-.3-.3-.53-.73-.53-1.21Z"
      />
      <path
        fill="currentColor"
        d="M8.74 3.49V2.33c0-.1-.06-.25-.19-.39-.14-.14-.29-.19-.39-.19H5.84c-.1 0-.25.05-.39.19-.14.14-.19.29-.19.39v1.16a.58.58 0 0 1-1.16 0V2.33c0-.48.23-.91.53-1.21.3-.3.73-.53 1.21-.53h2.32c.48 0 .91.23 1.21.53.3.3.53.73.53 1.21v1.16a.58.58 0 1 1-1.16 0Z"
      />
      <path
        fill="currentColor"
        d="M5.25 9.91V6.43a.58.58 0 1 1 1.16 0v3.48a.58.58 0 1 1-1.16 0Zm2.34 0V6.43a.58.58 0 1 1 1.16 0v3.48a.58.58 0 1 1-1.16 0Z"
      />
    </svg>
  );
}

function AlertTriangleIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10.16 1.68a2.6 2.6 0 0 1 2.26 1.31l6.13 10.85a2.6 2.6 0 0 1-2.27 3.88H4.01a2.6 2.6 0 0 1-2.27-3.88L7.87 3a2.6 2.6 0 0 1 2.29-1.32Zm-.01 1.56a1.04 1.04 0 0 0-.92.53L3.1 14.61a1.04 1.04 0 0 0 .91 1.55h12.27a1.04 1.04 0 0 0 .91-1.55L11.06 3.77a1.04 1.04 0 0 0-.91-.53Z"
      />
      <path
        fill="currentColor"
        d="M10.15 6.11c.43 0 .78.35.78.78v3.61a.78.78 0 1 1-1.56 0V6.89c0-.43.35-.78.78-.78Zm0 7.22a.97.97 0 1 1 0-1.94.97.97 0 0 1 0 1.94Z"
      />
    </svg>
  );
}

function PreviewIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M8 1.3 2.64 4.36v7.28L8 14.7l5.36-3.06V4.36L8 1.3Zm0 1.54 3.82 2.18L8 7.2 4.18 5.02 8 2.84Zm-4.02 3.5 3.35 1.92v3.9L3.98 10.2V6.34Zm4.69 5.82v-3.9l3.35-1.92v3.86l-3.35 1.96Z"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10.48 12.24v-1.16c0-.46-.18-.9-.51-1.23a1.75 1.75 0 0 0-1.23-.51H5.26c-.46 0-.9.18-1.23.51-.33.33-.51.77-.51 1.23v1.16a.58.58 0 1 1-1.16 0v-1.16c0-.77.31-1.51.85-2.05a2.9 2.9 0 0 1 2.05-.85h3.48c.77 0 1.51.31 2.05.85.54.54.85 1.28.85 2.05v1.16a.58.58 0 1 1-1.16 0Z"
      />
      <path
        fill="currentColor"
        d="M8.74 4.08a1.74 1.74 0 1 0-3.48 0 1.74 1.74 0 0 0 3.48 0ZM9.9 4.08a2.9 2.9 0 1 1-5.8 0 2.9 2.9 0 0 1 5.8 0Z"
      />
    </svg>
  );
}

function StatIcon({ kind }) {
  if (kind === "designs") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M13.36 3.31a.67.67 0 0 0-.67-.67H3.31a.67.67 0 0 0-.67.67v9.38c0 .37.3.67.67.67h9.38c.37 0 .67-.3.67-.67V3.31Zm1.34 9.38a2.01 2.01 0 0 1-2.01 2.01H3.31a2.01 2.01 0 0 1-2.01-2.01V3.31A2.01 2.01 0 0 1 3.31 1.3h9.38a2.01 2.01 0 0 1 2.01 2.01v9.38Z"
        />
        <path
          fill="currentColor"
          d="M14.03 5.33a.67.67 0 1 1 0 1.34H1.97a.67.67 0 1 1 0-1.34h12.06Zm-8.7 8.69V5.98a.67.67 0 1 1 1.34 0v8.04a.67.67 0 1 1-1.34 0Z"
        />
      </svg>
    );
  }

  if (kind === "saved") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M1.3 3.31A2.01 2.01 0 0 1 3.31 1.3h6.84c.53.01 1.04.22 1.4.6l2.55 2.54c.37.37.58.88.6 1.41v6.84a2.01 2.01 0 0 1-2.01 2.01H3.31A2.01 2.01 0 0 1 1.3 12.69V3.31Zm2.01-.67a.67.67 0 0 0-.67.67v9.38c0 .37.3.67.67.67h9.38c.37 0 .67-.3.67-.67V5.87l-.01-.08a.67.67 0 0 0-.19-.39L10.61 2.84a.67.67 0 0 0-.39-.19l-.08-.01H3.31Z"
        />
        <path
          fill="currentColor"
          d="M5.99 8.1a.67.67 0 0 1 .95 0l.7.7 2.77-2.77a.67.67 0 1 1 .95.95L8.11 10.22a.67.67 0 0 1-.95 0L5.99 9.05a.67.67 0 0 1 0-.95Z"
        />
      </svg>
    );
  }

  if (kind === "furniture") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M4.66 4.02c0-.74.6-1.34 1.34-1.34h4.02c.74 0 1.34.6 1.34 1.34v4.69c0 .74-.6 1.34-1.34 1.34H6c-.74 0-1.34-.6-1.34-1.34V4.02Zm1.34 0v4.69h4.02V4.02H6Z"
        />
        <path
          fill="currentColor"
          d="M2.64 6.01a.67.67 0 0 1 .67.67v6.01a.67.67 0 1 1-1.34 0V6.68a.67.67 0 0 1 .67-.67Zm10.72 0a.67.67 0 0 1 .67.67v6.01a.67.67 0 1 1-1.34 0V6.68a.67.67 0 0 1 .67-.67Z"
        />
        <path
          fill="currentColor"
          d="M4.66 10.72a.67.67 0 0 1 .67.67v1.3a.67.67 0 1 1-1.34 0v-1.3a.67.67 0 0 1 .67-.67Zm6.68 0a.67.67 0 0 1 .67.67v1.3a.67.67 0 1 1-1.34 0v-1.3a.67.67 0 0 1 .67-.67Z"
        />
      </svg>
    );
  }

  if (kind === "last-edited") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M8 .63a7.37 7.37 0 1 1 0 14.74A7.37 7.37 0 0 1 8 .63Zm0 1.34a6.03 6.03 0 1 0 0 12.06A6.03 6.03 0 0 0 8 1.97Z"
        />
        <path
          fill="currentColor"
          d="M8 4.32c.37 0 .67.3.67.67v2.63l1.94 1.12a.67.67 0 1 1-.67 1.16L7.66 8.58A.67.67 0 0 1 7.33 8V4.99c0-.37.3-.67.67-.67Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.64 3.31a2.01 2.01 0 0 1 2.01-2.01h6.7a2.01 2.01 0 0 1 2.01 2.01v2.01a.67.67 0 0 1-1.34 0V3.31a.67.67 0 0 0-.67-.67h-6.7a.67.67 0 0 0-.67.67v9.38a.67.67 0 0 0 .67.67h3.35a.67.67 0 1 1 0 1.34H4.65a2.01 2.01 0 0 1-2.01-2.01V3.31Z"
      />
      <path
        fill="currentColor"
        d="M7.33 8.67A.67.67 0 0 1 8 8h3.35a.67.67 0 1 1 0 1.34H8a.67.67 0 0 1-.67-.67Zm3.35 0a.67.67 0 0 1 .67-.67h2.68a.67.67 0 1 1 0 1.34h-2.68a.67.67 0 0 1-.67-.67Zm0 2.68a.67.67 0 0 1 .67-.67h2.68a.67.67 0 1 1 0 1.34h-2.68a.67.67 0 0 1-.67-.67Z"
      />
    </svg>
  );
}

function formatValue(value) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return "--";
  }

  const roundedValue = Math.round(numericValue * 100) / 100;
  return Number.isInteger(roundedValue)
    ? String(roundedValue)
    : String(roundedValue).replace(/\.?0+$/, "");
}

function formatRoomSize(room) {
  return `${formatValue(room.width)}${room.unit} x ${formatValue(room.length)}${room.unit}`;
}

function formatOwnerName(owner) {
  if (owner === "admin") {
    return "Minada";
  }

  if (owner === "user") {
    return "Baboshky";
  }

  if (typeof owner !== "string" || !owner.trim()) {
    return "Saved Design";
  }

  return owner
    .trim()
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isSameDay(leftDate, rightDate) {
  return (
    leftDate.getFullYear() === rightDate.getFullYear() &&
    leftDate.getMonth() === rightDate.getMonth() &&
    leftDate.getDate() === rightDate.getDate()
  );
}

function formatRelativeTime(timestamp) {
  if (!timestamp) {
    return "Just now";
  }

  const diffMs = Date.now() - timestamp;
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) {
    return "Just now";
  }

  if (diffMs < hour) {
    const minutes = Math.max(1, Math.round(diffMs / minute));
    return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (diffMs < day) {
    const hours = Math.max(1, Math.round(diffMs / hour));
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  if (diffMs < day * 7) {
    const days = Math.max(1, Math.round(diffMs / day));
    return `${days} day${days === 1 ? "" : "s"} ago`;
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(timestamp));
}

function DesignPreview({ design }) {
  const roomWidth = Math.max(Number(design.room.width) || 1, 1);
  const roomLength = Math.max(Number(design.room.length) || 1, 1);
  const previewItems = design.items.slice(0, MAX_PREVIEW_ITEMS);

  return (
    <RoomShapePreview
      shape={design.room.shape}
      wallColor={design.room.wallColor}
      className="design-preview-room"
      surfaceClassName="design-preview-surface"
      gridClassName="design-preview-grid"
    >
      {previewItems.map((item) => {
        const left = Math.min(Math.max((item.x / roomWidth) * 100, 0), 92);
        const top = Math.min(Math.max((item.y / roomLength) * 100, 0), 88);
        const width = Math.min(Math.max((item.width / roomWidth) * 100, 8), 58);
        const height = Math.min(
          Math.max((item.height / roomLength) * 100, 8),
          48,
        );

        return (
          <span
            key={item.id}
            className="design-preview-item"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
              backgroundColor: item.color,
              transform: `rotate(${item.rotation}deg)`,
            }}
          />
        );
      })}
    </RoomShapePreview>
  );
}

function DeleteConfirmationModal({ design, onClose, onConfirm }) {
  useEffect(() => {
    const handleEscapeKey = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscapeKey);
    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [onClose]);

  return (
    <div
      className="delete-confirmation-backdrop"
      role="presentation"
      onMouseDown={onClose}
    >
      <div
        className="delete-confirmation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-design-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="delete-confirmation-icon-wrap">
          <AlertTriangleIcon />
        </div>

        <h2 id="delete-design-title">Delete Design?</h2>
        <p>
          Are you sure you want to permanently delete{" "}
          <strong>"{design.name}"</strong>? This action cannot be undone and
          will remove the saved 2D layout and 3D preview data for this design.
        </p>

        <div className="delete-confirmation-actions">
          <button
            type="button"
            className="delete-confirmation-button button-secondary"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="delete-confirmation-button button-danger"
            onClick={() => onConfirm(design.id)}
          >
            <TrashIcon />
            <span>Delete Design</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function EmptyState({ query, onCreateDesign, canCreateDesign }) {
  return (
    <div className="dashboard-empty-state">
      <div className="dashboard-empty-card">
        <h3>{query ? "No designs match that search" : "No saved designs yet"}</h3>
        <p>
          {query
            ? "Try a different keyword, or save a layout from the editor first."
            : canCreateDesign
              ? "Saved room layouts will appear here once you store a design from the editor."
              : "Admin master layouts and your saved copies will appear here once designs are available in this browser."}
        </p>
        {canCreateDesign ? (
          <button
            type="button"
            className="create-new-button"
            onClick={onCreateDesign}
          >
            <PlusIcon />
            <span>Create New Design</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function DesignCard({
  design,
  username,
  userRole,
  onOpenDesign,
  onOpenPreview,
  onDeleteRequest,
}) {
  const furnitureCount = design.furnitureCount ?? design.items.length;
  const ownerLabel = formatOwnerName(design.owner);
  const designPermissions = getDesignPermissions(design, {
    username,
    role: userRole,
  });
  const statusLabel = design.isTemplate
    ? "Master"
    : designPermissions.isOwner
      ? "Saved"
      : "Shared";
  const openLabel = designPermissions.canOverwrite ? "Edit" : "Open";

  return (
    <article className="design-card">
      <div className="design-image-wrap">
        <DesignPreview design={design} />
        <span
          className={`status-badge ${
            design.isTemplate ? "status-master" : "status-saved"
          }`}
        >
          {statusLabel}
        </span>
      </div>

      <div className="design-card-body">
        <div className="design-title-row">
          <h3>{design.name}</h3>
          <span
            className="design-wall-chip"
            style={{ backgroundColor: design.room.wallColor }}
          />
        </div>

        <div className="design-owner-row">
          <div className="design-owner-meta">
            <UserIcon />
            <span>{ownerLabel}</span>
          </div>
          <span className="design-item-count">
            {furnitureCount} item{furnitureCount === 1 ? "" : "s"}
          </span>
        </div>

        <div className="design-room-row">
          <div className="design-room-meta">
            <RoomIcon />
            <span>{design.room.name}</span>
          </div>
          <span className="design-shape-pill">
            {getRoomShapeLabel(design.room.shape)}
          </span>
        </div>

        <div className="design-meta-grid">
          <div className="design-meta-block">
            <span>Dimensions</span>
            <strong>{formatRoomSize(design.room)}</strong>
          </div>
          <div className="design-meta-block align-end">
            <span>Modified</span>
            <strong>{formatRelativeTime(design.updatedAt)}</strong>
          </div>
        </div>
      </div>

      <div className="design-action-row">
        <div className="design-action-group">
          <button
            type="button"
            className="design-action-button"
            onClick={() => onOpenDesign?.(design.id)}
          >
            <OpenIcon />
            <span>{openLabel}</span>
          </button>
          <button
            type="button"
            className="design-action-button action-preview"
            onClick={() => onOpenPreview?.(design)}
          >
            <PreviewIcon />
            <span>3D Preview</span>
          </button>
        </div>
        <div className="design-action-side">
          {designPermissions.canDelete ? (
            <button
              type="button"
              className="design-icon-button action-delete"
              onClick={() => onDeleteRequest?.(design)}
              aria-label={`Delete ${design.name}`}
              title={`Delete ${design.name}`}
            >
              <TrashIcon />
            </button>
          ) : designPermissions.isProtectedMaster ? (
            <span
              className="design-action-note"
              title="Admin master designs cannot be deleted by user accounts"
            >
              Protected
            </span>
          ) : (
            <span className="design-action-placeholder" aria-hidden="true" />
          )}
        </div>
      </div>
    </article>
  );
}

function DashboardPage({
  username,
  view = "dashboard",
  savedDesigns = [],
  onLogout,
  onCreateDesign,
  onGoDashboard,
  onSavedDesigns,
  onOpenDesign,
  onOpenPreview,
  onDeleteDesign,
  canCreateDesign: canCreateDesignProp = true,
}) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("recent");
  const [savedDesignView, setSavedDesignView] = useState("grid");
  const [designPendingDelete, setDesignPendingDelete] = useState(null);
  const isSavedView = view === "saved";
  const userRole = getAccountRole(username);
  const isAdminView = userRole === "admin";
  const displayName = getAccountDisplayName(username);
  const canCreateDesign = canCreateDesignProp && canCreateBlankDesigns(userRole);

  const savedTodayCount = useMemo(() => {
    const today = new Date();

    return savedDesigns.filter((design) =>
      isSameDay(new Date(design.updatedAt), today),
    ).length;
  }, [savedDesigns]);

  const totalFurniturePieces = useMemo(
    () =>
      savedDesigns.reduce(
        (total, design) =>
          total + (design.furnitureCount ?? design.items.length),
        0,
      ),
    [savedDesigns],
  );

  const latestEditedLabel = useMemo(() => {
    if (savedDesigns.length === 0) {
      return "--";
    }

    return formatRelativeTime(savedDesigns[0].updatedAt);
  }, [savedDesigns]);

  const summaryItems = [
    {
      title: "Total Designs",
      value: String(savedDesigns.length),
      detail: "Saved projects in this browser",
      icon: "designs",
      tone: "blue",
    },
    {
      title: "Saved Today",
      value: String(savedTodayCount),
      detail: "Projects updated today",
      icon: "saved",
      tone: "green",
    },
    {
      title: "Furniture Items",
      value: String(totalFurniturePieces),
      detail: "Pieces placed across saved layouts",
      icon: "furniture",
      tone: "orange",
    },
    {
      title: "Last Edited",
      value: latestEditedLabel,
      detail: "Most recent design update",
      icon: "last-edited",
      tone: "pink",
    },
  ];

  const filteredDesigns = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchedDesigns = normalizedQuery
      ? savedDesigns.filter((design) => {
          const searchableText =
            `${design.name} ${design.room.name}`.toLowerCase();
          return searchableText.includes(normalizedQuery);
        })
      : savedDesigns;

    return [...matchedDesigns].sort((left, right) => {
      if (sortBy === "name") {
        return left.name.localeCompare(right.name);
      }

      if (sortBy === "oldest") {
        return left.createdAt - right.createdAt;
      }

      return right.updatedAt - left.updatedAt;
    });
  }, [query, savedDesigns, sortBy]);

  const recentDesigns = savedDesigns.slice(0, MAX_RECENT_DESIGNS);
  const savedDesignsDescription = isAdminView
    ? "Manage your admin master templates and shared room layouts."
    : "Browse admin master templates and manage your personal saved designs.";
  const heroDescription = isAdminView
    ? `You currently have ${
        savedDesigns.length
      } admin design${savedDesigns.length === 1 ? "" : "s"} available in this browser.`
    : `You can browse admin master templates and manage ${
        savedDesigns.length
      } personal or shared design${savedDesigns.length === 1 ? "" : "s"} from this browser.`;

  const handleRequestDelete = (design) => {
    setDesignPendingDelete(design);
  };

  const handleCloseDeleteModal = () => {
    setDesignPendingDelete(null);
  };

  const handleConfirmDelete = (designId) => {
    const didDelete = onDeleteDesign?.(designId);

    if (didDelete !== false) {
      setDesignPendingDelete(null);
    }
  };

  return (
    <div className="dashboard-page">
      <AppTopNav
        username={username}
        activeTab={isSavedView ? "saved" : "dashboard"}
        onDashboard={onGoDashboard}
        onCreateDesign={onCreateDesign}
        onSavedDesigns={onSavedDesigns}
        onLogout={onLogout}
        canCreateDesign={canCreateDesign}
      />

      <main className="dashboard-content">
        {isSavedView ? (
          <>
            <section className="stats-grid">
              {summaryItems.map((item) => (
                <article key={item.title} className="stat-card">
                  <div className={`stat-icon-wrap tone-${item.tone}`}>
                    <StatIcon kind={item.icon} />
                  </div>
                  <p className="stat-title">{item.title}</p>
                  <p className="stat-value">{item.value}</p>
                  <p className="stat-detail">{item.detail}</p>
                </article>
              ))}
            </section>

            <section className="saved-designs-section">
              <div className="saved-designs-header">
                <div>
                  <h1>Saved Designs</h1>
                  <p>{savedDesignsDescription}</p>
                </div>

                <div className="saved-designs-controls">
                  <label
                    className="saved-search-shell"
                    htmlFor="saved-design-search"
                  >
                    <SearchIcon />
                    <input
                      id="saved-design-search"
                      type="search"
                      placeholder="Search designs or room names..."
                      value={query}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>

                  <label
                    className="saved-sort-shell"
                    htmlFor="saved-design-sort"
                  >
                    <span>Sort by</span>
                    <select
                      id="saved-design-sort"
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value)}
                    >
                      <option value="recent">Last Modified</option>
                      <option value="oldest">Oldest</option>
                      <option value="name">Name</option>
                    </select>
                  </label>

                  <div
                    className="saved-view-toggle"
                    role="group"
                    aria-label="Saved designs view mode"
                  >
                    <button
                      type="button"
                      className={`saved-view-button ${
                        savedDesignView === "grid" ? "is-active" : ""
                      }`}
                      aria-pressed={savedDesignView === "grid"}
                      aria-label="Show saved designs in grid view"
                      onClick={() => setSavedDesignView("grid")}
                    >
                      <GridViewIcon />
                    </button>
                    <button
                      type="button"
                      className={`saved-view-button ${
                        savedDesignView === "list" ? "is-active" : ""
                      }`}
                      aria-pressed={savedDesignView === "list"}
                      aria-label="Show saved designs in list view"
                      onClick={() => setSavedDesignView("list")}
                    >
                      <ListViewIcon />
                    </button>
                  </div>
                </div>
              </div>

              {filteredDesigns.length === 0 ? (
                <EmptyState
                  query={query}
                  onCreateDesign={onCreateDesign}
                  canCreateDesign={canCreateDesign}
                />
              ) : (
                <div
                  className={`designs-grid ${
                    savedDesignView === "list" ? "is-list" : ""
                  }`.trim()}
                >
                  {filteredDesigns.map((design) => (
                    <DesignCard
                      key={design.id}
                      design={design}
                      username={username}
                      userRole={userRole}
                      onOpenDesign={onOpenDesign}
                      onOpenPreview={onOpenPreview}
                      onDeleteRequest={handleRequestDelete}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        ) : (
          <>
            <section className="dashboard-hero">
              <div className="hero-copy">
                <h1>Good Morning, {displayName}</h1>
                <p>
                  {canCreateDesign ? (
                    <>
                      {isAdminView ? "Ready to manage templates? You currently have " : "Ready to keep building? You currently have "}
                      <strong>
                        {savedDesigns.length} saved design
                        {savedDesigns.length === 1 ? "" : "s"}
                      </strong>{" "}
                      stored in this browser.
                    </>
                  ) : (
                    heroDescription
                  )}
                </p>
              </div>

              {canCreateDesign ? (
                <button
                  type="button"
                  className="create-new-button"
                  onClick={onCreateDesign}
                >
                  <PlusIcon />
                  <span>Create New Design</span>
                </button>
              ) : null}
            </section>

            <section className="stats-grid">
              {summaryItems.map((item) => (
                <article key={item.title} className="stat-card">
                  <div className={`stat-icon-wrap tone-${item.tone}`}>
                    <StatIcon kind={item.icon} />
                  </div>
                  <p className="stat-title">{item.title}</p>
                  <p className="stat-value">{item.value}</p>
                  <p className="stat-detail">{item.detail}</p>
                </article>
              ))}
            </section>

            <section className="recent-designs-section">
              <div className="recent-header">
                <div>
                  <h2>Recent Designs</h2>
                  <p>Quick access to your most recently updated floor plans.</p>
                </div>
                <button
                  type="button"
                  className="view-all-button"
                  onClick={onSavedDesigns}
                >
                  <span>View all designs</span>
                  <ChevronRightIcon />
                </button>
              </div>

              {recentDesigns.length === 0 ? (
                <EmptyState
                  query=""
                  onCreateDesign={onCreateDesign}
                  canCreateDesign={canCreateDesign}
                />
              ) : (
                <div className="designs-grid">
                  {recentDesigns.map((design) => (
                    <DesignCard
                      key={design.id}
                      design={design}
                      username={username}
                      userRole={userRole}
                      onOpenDesign={onOpenDesign}
                      onOpenPreview={onOpenPreview}
                      onDeleteRequest={handleRequestDelete}
                    />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      <footer className="dashboard-footer">
        <div className="dashboard-footer-inner">
          <p>&#169; 2026 FurnitureViz</p>
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </footer>

      {designPendingDelete ? (
        <DeleteConfirmationModal
          design={designPendingDelete}
          onClose={handleCloseDeleteModal}
          onConfirm={handleConfirmDelete}
        />
      ) : null}
    </div>
  );
}

export default DashboardPage;
