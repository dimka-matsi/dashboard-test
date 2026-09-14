const trimSlash = (value: string): string => value.replace(/\/+$/, '');

/** База API: same-origin `/api`, если не переопределено через VITE_API_BASE. */
export const API_BASE: string = trimSlash(import.meta.env.VITE_API_BASE ?? '/api');

/**
 * Сценарий для проверки состояний: ?scenario=empty|error|invalid|slow в адресе страницы
 * прозрачно пробрасывается в запрос к API.
 */
export function getScenario(search: string = window.location.search): string | null {
  const value = new URLSearchParams(search).get('scenario');
  return value && value.trim() !== '' ? value.trim() : null;
}

export function orgTreeUrl(scenario: string | null): string {
  const query = scenario ? `?scenario=${encodeURIComponent(scenario)}` : '';
  return `${API_BASE}/org-tree${query}`;
}
