const API_URL = 'https://meetplanning-production.up.railway.app/api';

export function getSession() {
  const raw = localStorage.getItem('meetplanning_session');
  return raw ? JSON.parse(raw) : null;
}
export function saveSession(session) { localStorage.setItem('meetplanning_session', JSON.stringify(session)); }
export function clearSession() { localStorage.removeItem('meetplanning_session'); }
export async function api(path, options = {}) {
  const session = getSession();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(session?.token ? { Authorization: `Bearer ${session.token}` } : {}), ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || 'เกิดข้อผิดพลาด');
  return data;
}
