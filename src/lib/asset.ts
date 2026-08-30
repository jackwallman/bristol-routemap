// Joins a root-relative path (e.g. "/data/foo.geojson") to the app's base URL,
// so runtime fetches still resolve when the app is served from a subpath
// (import.meta.env.BASE_URL is "/bristol-routemap/" in production, "/" in dev).
export function asset(path: string): string {
  return import.meta.env.BASE_URL + path.replace(/^\//, "");
}
