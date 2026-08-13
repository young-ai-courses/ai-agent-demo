const TABLE = 'chat_messages';

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  return { url, key };
}

function isValidSessionId(value) {
  return typeof value === 'string' && /^[a-z0-9-]{16,80}$/.test(value);
}

export async function GET(request) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    return Response.json({ messages: [], storage: 'disabled' });
  }

  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('session_id');
  if (!isValidSessionId(sessionId)) {
    return Response.json({ error: 'session_id 格式不正確' }, { status: 400 });
  }

  const endpoint =
    `${url}/rest/v1/${TABLE}` +
    `?select=role,content,created_at&session_id=eq.${encodeURIComponent(sessionId)}` +
    '&order=created_at.asc&limit=100';

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    return Response.json(
      { error: `Supabase 回了 ${response.status}`, detail: detail.slice(0, 300) },
      { status: 502 }
    );
  }

  const rows = await response.json();
  return Response.json({
    messages: rows.map((row) => ({ role: row.role, content: row.content })),
    storage: 'supabase',
  });
}

export async function POST(request) {
  const { url, key } = getSupabaseConfig();
  if (!url || !key) {
    return Response.json({ ok: false, storage: 'disabled' });
  }

  const { session_id: sessionId, role, content } = await request.json();
  if (!isValidSessionId(sessionId)) {
    return Response.json({ error: 'session_id 格式不正確' }, { status: 400 });
  }
  if (!['user', 'assistant'].includes(role)) {
    return Response.json({ error: 'role 不正確' }, { status: 400 });
  }
  if (!content || typeof content !== 'string' || content.length > 12000) {
    return Response.json({ error: 'content 不正確' }, { status: 400 });
  }

  const response = await fetch(`${url}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      session_id: sessionId,
      role,
      content,
    }),
  });

  if (!response.ok) {
    const detail = await response.text();
    return Response.json(
      { error: `Supabase 回了 ${response.status}`, detail: detail.slice(0, 300) },
      { status: 502 }
    );
  }

  return Response.json({ ok: true, storage: 'supabase' });
}
