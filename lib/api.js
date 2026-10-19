// Every request carries Telegram's signed launch data; the server verifies it.
export async function api(path, body) {
  const initData = window.Telegram?.WebApp?.initData || '';
  const res = await fetch(path, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', 'x-tg-init-data': initData },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || 'Request failed');
  return j;
}
