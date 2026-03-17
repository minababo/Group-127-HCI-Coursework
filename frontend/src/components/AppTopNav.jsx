import "./AppTopNav.css";
import {
  getAccountDisplayName,
  getAccountRole,
  getRoleLabel,
} from "../utils/account";

function LogoIcon() {
  return (
    <svg viewBox="0 0 26 26" aria-hidden="true">
      <path
        fill="currentColor"
        d="M13 1.122c.567 0 1.123.15 1.615.433l7.56 4.32.004.003.18.112a3.654 3.654 0 0 1 1.185 1.073c.284.492.434 1.05.434 1.618v8.642c0 .568-.15 1.126-.434 1.618a3.636 3.636 0 0 1-1.185 1.184l-.004.003-7.56 4.32A3.258 3.258 0 0 1 13 24.878c-.567 0-1.124-.149-1.616-.432l-7.56-4.32-.004-.003a3.64 3.64 0 0 1-1.185-1.184A3.253 3.253 0 0 1 2.2 17.32V8.68l.007-.213c.033-.494.179-.975.427-1.405A3.636 3.636 0 0 1 3.82 5.877l.004-.003 7.56-4.32A3.259 3.259 0 0 1 13 1.122Zm0 2.16a1.08 1.08 0 0 0-.54.144l-.004.003-7.556 4.316.001.001a1.081 1.081 0 0 0-.395.395c-.095.164-.145.35-.145.54v8.638l.01.141c.018.14.063.275.134.398.094.163.229.298.391.393l7.56 4.32.004.002.127.063A1.368 1.368 0 0 0 13 22.718c.19 0 .376-.05.54-.145l.004-.002 7.56-4.32a1.09 1.09 0 0 0 .39-.393c.095-.163.145-.349.146-.538V8.681l-.01-.141a1.082 1.082 0 0 0-.134-.398 1.076 1.076 0 0 0-.395-.395l-7.556-4.318-.004-.002A1.08 1.08 0 0 0 13 3.282Z"
      />
      <path
        fill="currentColor"
        d="M21.957 6.604a1.08 1.08 0 0 1 1.375.449 1.08 1.08 0 0 1-.397 1.474l-9.397 5.4a1.08 1.08 0 0 1-1.076 0l-9.396-5.4-.093-.06a1.08 1.08 0 0 1-.306-1.415 1.08 1.08 0 0 1 1.376-.448l.098.05L13 11.743l8.858-5.09.099-.05Z"
      />
      <path
        fill="currentColor"
        d="M11.92 23.82V13.02a1.08 1.08 0 1 1 2.16 0v10.8a1.08 1.08 0 0 1-2.16 0Z"
      />
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.655 2.655v4.69h3.35v-4.69h-3.35Zm4.69 4.69a1.34 1.34 0 0 1-1.34 1.34h-3.35a1.34 1.34 0 0 1-1.34-1.34v-4.69a1.34 1.34 0 0 1 1.34-1.34h3.35a1.34 1.34 0 0 1 1.34 1.34v4.69Zm2.65-4.68v2.01h3.35v-2.01h-3.35Zm4.69 2.01a1.34 1.34 0 0 1-1.34 1.34h-3.35a1.34 1.34 0 0 1-1.34-1.34v-2.01a1.34 1.34 0 0 1 1.34-1.34h3.35a1.34 1.34 0 0 1 1.34 1.34v2.01Zm-4.69 3.98v4.69h3.35v-4.69h-3.35Zm4.69 4.69a1.34 1.34 0 0 1-1.34 1.34h-3.35a1.34 1.34 0 0 1-1.34-1.34v-4.69a1.34 1.34 0 0 1 1.34-1.34h3.35a1.34 1.34 0 0 1 1.34 1.34v4.69Zm-12.03-2.02v2.01h3.35v-2.01h-3.35Zm4.69 2.01a1.34 1.34 0 0 1-1.34 1.34h-3.35a1.34 1.34 0 0 1-1.34-1.34v-2.01a1.34 1.34 0 0 1 1.34-1.34h3.35a1.34 1.34 0 0 1 1.34 1.34v2.01Z"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.69 7.33a.67.67 0 1 1 0 1.34H3.31a.67.67 0 1 1 0-1.34h9.38Z"
      />
      <path
        fill="currentColor"
        d="M7.33 12.69V3.31a.67.67 0 1 1 1.34 0v9.38a.67.67 0 1 1-1.34 0Z"
      />
    </svg>
  );
}

function FolderIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M1.97 3.31c0-.74.6-1.34 1.34-1.34h2.61c.22 0 .43.05.63.15.2.11.36.26.47.44l.54.8a.79.79 0 0 0 .64.34h3.97c.74 0 1.34.6 1.34 1.34v.67a1.7 1.7 0 0 1 1.1 2.05l-1.03 4.02c-.09.36-.3.67-.6.9-.3.23-.66.36-1.04.35H3.31c-.74 0-1.34-.6-1.34-1.34V3.31Zm0 8.71c0 .37.3.67.67.67h9.68a.94.94 0 0 0 .9-.67l1.03-4.02c.04-.16.02-.33-.06-.47a.85.85 0 0 0-.36-.34.84.84 0 0 0-.39-.1H6.17a1.9 1.9 0 0 0-1.69 1.04l-1 1.94-1.19-.62 1.01-1.94a3.24 3.24 0 0 1 2.9-1.75h6.49v-.67a.67.67 0 0 0-.67-.67H8.05a2.1 2.1 0 0 1-1.75-.94l-.54-.8a.79.79 0 0 0-.22-.21.72.72 0 0 0-.28-.07H2.64a.67.67 0 0 0-.67.67v8.71Z"
      />
    </svg>
  );
}

function AppTopNav({
  username,
  activeTab,
  onDashboard,
  onCreateDesign,
  onSavedDesigns,
  canCreateDesign = true,
}) {
  const accountRole = getAccountRole(username);
  const displayName = getAccountDisplayName(username);
  const initials = displayName
    .split(" ")
    .map((name) => name[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="app-top-nav">
      <div className="app-top-nav-inner">
        <button type="button" className="brand-block" onClick={onDashboard}>
          <span className="brand-block-icon">
            <LogoIcon />
          </span>
          <span className="brand-block-text">FurnitureViz</span>
        </button>

        <nav className="main-nav">
          <button
            type="button"
            className={`main-nav-item ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={onDashboard}
          >
            <span className="main-nav-icon">
              <DashboardIcon />
            </span>
            <span>Dashboard</span>
          </button>
          {canCreateDesign ? (
            <button
              type="button"
              className={`main-nav-item ${activeTab === "create" ? "active" : ""}`}
              onClick={onCreateDesign}
            >
              <span className="main-nav-icon">
                <PlusIcon />
              </span>
              <span>Create Design</span>
            </button>
          ) : null}
          <button
            type="button"
            className={`main-nav-item ${activeTab === "saved" ? "active" : ""}`}
            onClick={onSavedDesigns}
          >
            <span className="main-nav-icon">
              <FolderIcon />
            </span>
            <span>Saved Designs</span>
          </button>
        </nav>

        <div className="top-nav-tools">
          <div className="user-shell">
            <div className="user-divider" />
            <div className="user-meta">
              <strong>{displayName}</strong>
              <span>{getRoleLabel(accountRole)} account</span>
            </div>

            <span className="avatar-badge">
              {initials}
              <span className="avatar-status-dot" />
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default AppTopNav;
