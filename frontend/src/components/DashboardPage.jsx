import AppTopNav from "./AppTopNav";
import "./DashboardPage.css";

const SUMMARY_ITEMS = [
  {
    title: "Total Designs",
    value: "124",
    detail: "+12% from last month",
    icon: "panel",
    tone: "blue",
  },
  {
    title: "Completed",
    value: "86",
    detail: "72% success rate",
    icon: "check",
    tone: "green",
  },
  {
    title: "In Progress",
    value: "32",
    detail: "Avg. 4 days to finish",
    icon: "timer",
    tone: "orange",
  },
  {
    title: "Favorites",
    value: "18",
    detail: "High client satisfaction",
    icon: "heart",
    tone: "pink",
  },
];

const DESIGN_ITEMS = [
  {
    title: "Modern Loft Living Room",
    owner: "Sarah Jenkins",
    status: "In Progress",
    updated: "Modified 2 hours ago",
    image: "/images/dashboard/modern-loft.png",
  },
  {
    title: "Coastal Kitchen Concept",
    owner: "Michael Chen",
    status: "Completed",
    updated: "Modified Yesterday",
    image: "/images/dashboard/coastal-kitchen.png",
  },
  {
    title: "Scandinavian Home Office",
    owner: "Elena Rodriguez",
    status: "Review",
    updated: "Modified 3 days ago",
    image: "/images/dashboard/scandinavian-office.png",
  },
  {
    title: "Minimalist Bedroom Suite",
    owner: "David Thompson",
    status: "In Progress",
    updated: "Modified 1 week ago",
    image: "/images/dashboard/minimalist-bedroom.png",
  },
  {
    title: "Industrial Dining Area",
    owner: "Jessica Wu",
    status: "Completed",
    updated: "Modified Oct 12, 2023",
    image: "/images/dashboard/industrial-dining.png",
  },
  {
    title: "Outdoor Patio Lounge",
    owner: "Robert Blake",
    status: "In Progress",
    updated: "Modified Oct 10, 2023",
    image: "/images/dashboard/patio-lounge.png",
  },
];

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

function EllipsisIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.66 8a1.34 1.34 0 1 1 2.68 0 1.34 1.34 0 0 1-2.68 0Zm0-4.67a1.34 1.34 0 1 1 2.68 0 1.34 1.34 0 0 1-2.68 0Zm0 9.34a1.34 1.34 0 1 1 2.68 0 1.34 1.34 0 0 1-2.68 0Z"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M10.48 12.24v-1.16a1.74 1.74 0 0 0-1.74-1.74H5.26a1.74 1.74 0 0 0-1.74 1.74v1.16a.58.58 0 0 1-1.16 0v-1.16A2.9 2.9 0 0 1 5.26 8.18h3.48a2.9 2.9 0 0 1 2.9 2.9v1.16a.58.58 0 0 1-1.16 0Z"
      />
      <path
        fill="currentColor"
        d="M8.74 4.08a1.74 1.74 0 1 0-3.48 0 1.74 1.74 0 0 0 3.48 0Zm1.16 0a2.9 2.9 0 1 1-5.8 0 2.9 2.9 0 0 1 5.8 0Z"
      />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12.22 7a5.22 5.22 0 1 0-10.44 0 5.22 5.22 0 0 0 10.44 0ZM13.38 7a6.38 6.38 0 1 1-12.76 0 6.38 6.38 0 0 1 12.76 0Z"
      />
      <path
        fill="currentColor"
        d="M6.43 3.51a.58.58 0 0 1 1.16 0v3.12l2 1a.58.58 0 0 1-.52 1.03l-2.32-1.16a.58.58 0 0 1-.32-.52V3.51Z"
      />
    </svg>
  );
}

function StatIcon({ kind }) {
  if (kind === "panel") {
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

  if (kind === "check") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M7.95 1.97a5.98 5.98 0 1 0 3.89 10.52 5.98 5.98 0 0 0-3.89-10.52Zm0-1.34A7.32 7.32 0 1 1 .63 7.95 7.32 7.32 0 0 1 7.95.63Z"
        />
        <path
          fill="currentColor"
          d="M13.53 2.18a.67.67 0 0 1 0 .95L8.46 8.2a.67.67 0 0 1-.95 0L5.5 6.19a.67.67 0 0 1 .95-.95l1.53 1.54 4.6-4.6a.67.67 0 0 1 .95 0Z"
        />
      </svg>
    );
  }

  if (kind === "timer") {
    return (
      <svg viewBox="0 0 16 16" aria-hidden="true">
        <path
          fill="currentColor"
          d="M9.34.66a.67.67 0 1 1 0 1.34H6.66a.67.67 0 1 1 0-1.34h2.68Z"
        />
        <path
          fill="currentColor"
          d="M9.53 6.85a.67.67 0 0 1 .95.95L8.47 9.81a.67.67 0 1 1-.95-.95l2.01-2.01Z"
        />
        <path
          fill="currentColor"
          d="M12.69 9.33a4.69 4.69 0 1 0-9.38 0 4.69 4.69 0 0 0 9.38 0Zm1.34 0a6.03 6.03 0 1 1-12.06 0 6.03 6.03 0 0 1 12.06 0Z"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M14.03 5.66a3.02 3.02 0 0 0-5.32-1.87L8 4.5l-.71-.71a3.02 3.02 0 0 0-5.15 2.16c0 1.08.62 1.98 1.45 2.83L8 13.08l4.22-4.22.37-.37c.82-.86 1.44-1.75 1.44-2.83Zm1.34 0c0 1.84-1.21 3.18-2.21 4.16L8.47 14.5a.67.67 0 0 1-.95 0L2.84 9.82l-.38-.38C1.55 8.5.63 7.27.63 5.66A4.36 4.36 0 0 1 4.98 1.3c1.14 0 2.16.43 3.02 1.1A4.34 4.34 0 0 1 11.01 1.3a4.36 4.36 0 0 1 4.36 4.36Z"
      />
    </svg>
  );
}

function statusSlug(status) {
  return status.toLowerCase().replace(/\s+/g, "-");
}

function DashboardPage({
  username,
  onCreateDesign,
  onGoDashboard,
  onSavedDesigns,
}) {
  const displayName = username === "admin" ? "Minada" : "Baboshky";

  return (
    <div className="dashboard-page">
      <AppTopNav
        username={username}
        activeTab="dashboard"
        onDashboard={onGoDashboard}
        onCreateDesign={onCreateDesign}
        onSavedDesigns={onSavedDesigns}
      />

      <main className="dashboard-content">
        <section className="dashboard-hero">
          <div className="hero-copy">
            <h1>Good Morning, {displayName}</h1>
            <p>
              Ready to transform spaces today? You have{" "}
              <strong>3 active reviews</strong> pending.
            </p>
          </div>

          <button
            type="button"
            className="create-new-button"
            onClick={onCreateDesign}
          >
            <PlusIcon />
            <span>Create New Design</span>
          </button>
        </section>

        <section className="stats-grid">
          {SUMMARY_ITEMS.map((item) => (
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

          <div className="designs-grid">
            {DESIGN_ITEMS.map((design) => (
              <article key={design.title} className="design-card">
                <div className="design-image-wrap">
                  {design.image ? (
                    <img src={design.image} alt={`${design.title} preview`} />
                  ) : (
                    <div className="image-placeholder">
                      <span>Image slot</span>
                    </div>
                  )}
                  <span
                    className={`status-badge status-${statusSlug(design.status)}`}
                  >
                    {design.status}
                  </span>
                </div>

                <div className="design-title-row">
                  <h3>{design.title}</h3>
                  <button
                    type="button"
                    className="more-button"
                    aria-label="More options"
                  >
                    <EllipsisIcon />
                  </button>
                </div>

                <div className="design-owner-row">
                  <UserIcon />
                  <span>{design.owner}</span>
                </div>

                <div className="design-meta-row">
                  <div className="updated-row">
                    <ClockIcon />
                    <span>{design.updated}</span>
                  </div>

                  <div className="dimension-tags">
                    <span>2D</span>
                    <span>3D</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="dashboard-footer">
        <div className="dashboard-footer-inner">
          <p>&#169; 2026 FurnitureViz</p>
          <button type="button">Privacy Policy</button>
          <button type="button">Terms of Service</button>
        </div>
      </footer>
    </div>
  );
}

export default DashboardPage;
