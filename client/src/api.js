export const getUser = () => JSON.parse(localStorage.getItem('user') || 'null');
export const setSession = (d) => { localStorage.setItem('token', d.token); localStorage.setItem('user', JSON.stringify(d.user)); };
export const logout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); };
export async function api(path, method = 'GET', body) {
  const token = localStorage.getItem('token');
  const res = await fetch('/api' + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: 'Bearer ' + token }) },
    body: body && JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || 'Something went wrong.');
  return data;
}
