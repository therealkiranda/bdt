// The API base URL comes from EXPO_PUBLIC_API_BASE_URL (see .env.example). It must include /api/v1.
const DEFAULT_BASE_URL = "https://blackdiamondtours.com.np/api/v1";

export const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL?.trim() || DEFAULT_BASE_URL).replace(/\/+$/, "");
export const REQUEST_TIMEOUT_MS = 20000;
// Refresh the access token this many seconds before it expires, so calls don't fail with a 401 first.
export const REFRESH_SKEW_SECONDS = 60;
