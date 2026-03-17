export const ACCOUNT_DEFINITIONS = {
  admin: {
    username: "admin",
    password: "admin123",
    role: "admin",
    displayName: "Minada",
  },
  user: {
    username: "user",
    password: "user123",
    role: "user",
    displayName: "Baboshky",
  },
};

function formatFallbackDisplayName(username) {
  if (typeof username !== "string" || !username.trim()) {
    return "FurnitureViz User";
  }

  return username
    .trim()
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function normalizeAccountIdentifier(identifier) {
  const trimmedIdentifier =
    typeof identifier === "string" ? identifier.trim().toLowerCase() : "";

  return trimmedIdentifier.includes("@")
    ? trimmedIdentifier.split("@")[0]
    : trimmedIdentifier;
}

export function validateAccountCredentials(identifier, password) {
  const username = normalizeAccountIdentifier(identifier);
  const account = ACCOUNT_DEFINITIONS[username];

  if (!account || account.password !== password) {
    return null;
  }

  return {
    username: account.username,
    role: account.role,
    displayName: account.displayName,
  };
}

export function getAccountRole(username) {
  return ACCOUNT_DEFINITIONS[username]?.role === "admin" ? "admin" : "user";
}

export function getAccountDisplayName(username) {
  return ACCOUNT_DEFINITIONS[username]?.displayName ?? formatFallbackDisplayName(username);
}

export function getRoleLabel(role) {
  return role === "admin" ? "Admin" : "User";
}

export function canCreateBlankDesigns(role) {
  return role === "admin";
}
