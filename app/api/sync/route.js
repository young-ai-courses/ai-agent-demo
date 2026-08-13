// 把 repo 裡的週報「存進 Supabase」
//
// 為什麼需要它：第一堂那支排程每週寫一個 .md 進 repo。檔案能看，但沒辦法累積查詢，
// 也沒辦法給別人的網站讀。存進資料庫之後，週報就變成資料，可以排序、可以篩、可以問。
//
// 怎麼用：網站上按「同步到資料庫」，或直接 POST /api/sync
//
// 🔴 前提：Supabase 那張表要先建好，而且要有 insert 的 policy（見 QUICKSTART 工單 4）
//    表名 weekly_digests，欄位：week (text, 唯一)、content (text)、created_at (timestamptz, 預設 now())

import fs from 'node:fs/promises';
import path from 'node:path';

export async function POST() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return Response.json(
      {
        error:
          '還沒接 Supabase。到 Vercel 專案 → Integrations → Supabase 裝起來（環境變數會自動注入），' +
          '然後 Redeploy。細節看 QUICKSTART 工單 4',
      },
      { status: 500 }
    );
  }

  // 讀 repo 裡的週報
  const dir = path.join(process.cwd(), 'reports', 'weekly');
  let names = [];
  try {
    names = (await fs.readdir(dir)).filter((n) => n.endsWith('.md'));
  } catch {
    return Response.json(
      { error: 'reports/weekly 裡還沒有週報。先去 Actions 跑一次 Weekly Competitor Digest' },
      { status: 400 }
    );
  }

  const rows = await Promise.all(
    names.map(async (n) => ({
      week: n.replace(/\.md$/, ''),
      content: await fs.readFile(path.join(dir, n), 'utf8'),
    }))
  );

  // upsert：同一週再跑一次就覆蓋，不會長出重複的列
  const res = await fetch(`${url}/rest/v1/weekly_digests?on_conflict=week`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(rows),
  });

  if (!res.ok) {
    const detail = await res.text();
    // 最常見：RLS 開著但沒有 insert policy → 42501 new row violates row-level security policy
    return Response.json(
      {
        error: `Supabase 回了 ${res.status}`,
        detail: detail.slice(0, 400),
        hint:
          detail.includes('row-level security')
            ? 'RLS 擋住了 —— 你需要一條允許 insert 的 policy（QUICKSTART 工單 4 有 SQL）'
            : undefined,
      },
      { status: 502 }
    );
  }

  const saved = await res.json();
  return Response.json({ ok: true, saved: saved.length, weeks: rows.map((r) => r.week) });
}
