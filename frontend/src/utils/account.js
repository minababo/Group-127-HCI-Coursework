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

const SESSION_STORAGE_KEY = "furnitureviz.session.v1";

function canUseLocalStorage() {
  return (
    typeof window !== "undefined" &&
    typeof window.localStorage !== "undefined"
  );
}

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

export function loadStoredSession() {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);
    const username = normalizeAccountIdentifier(parsedValue?.username);

    if (!ACCOUNT_DEFINITIONS[username]) {
      clearStoredSession();
      return null;
    }

    return {
      username,
      role: getAccountRole(username),
      displayName: getAccountDisplayName(username),
    };
  } catch {
    return null;
  }
}

export function persistStoredSession(account) {
  if (!canUseLocalStorage()) {
    return;
  }

  const username = normalizeAccountIdentifier(
    typeof account === "string" ? account : account?.username,
  );

  if (!ACCOUNT_DEFINITIONS[username]) {
    return;
  }

  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      username,
      role: getAccountRole(username),
      displayName: getAccountDisplayName(username),
    }),
  );
}

export function clearStoredSession() {
  if (!canUseLocalStorage()) {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
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
  return role === "admin" || role === "user";
}
