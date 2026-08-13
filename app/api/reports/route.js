// 這支負責「把週報拿出來」
//
// 兩個來源，依序試：
//   ① Supabase（如果你已經接了）—— 每一週都存在資料庫裡，可以累積、可以查
//   ② repo 裡的 reports/weekly/*.md —— 第一堂的 GitHub Actions 每週寫進來的檔案
//
// 為什麼可以讀得到那個資料夾：因為這個 Next.js app 就住在 repo 根目錄。
// 如果 app 放在子目錄（並在 Vercel 設 Root Directory），它就讀不到外面的檔案 ——
// Vercel 官方寫得很清楚：「Your app will not be able to access files outside of that directory」。

import fs from 'node:fs/promises';
import path from 'node:path';

// ── ① Supabase（沒接就跳過）
async function fromSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const res = await fetch(
    `${url}/rest/v1/weekly_digests?select=week,content,created_at&order=week.desc`,
    { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store' }
  );
  if (!res.ok) return null;              // 表還沒建、或 RLS 把你擋住了
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return { source: 'supabase', reports: rows.map((r) => ({ week: r.week, content: r.content })) };
}

// ── ② repo 裡的週報檔案
async function fromFiles() {
  const dir = path.join(process.cwd(), 'reports', 'weekly');
  let names = [];
  try {
    names = (await fs.readdir(dir)).filter((n) => n.endsWith('.md'));
  } catch {
    return { source: 'none', reports: [] };   // 還沒跑過第一堂那支排程
  }
  names.sort().reverse();
  const reports = await Promise.all(
    names.map(async (n) => ({
      week: n.replace(/\.md$/, ''),
      content: await fs.readFile(path.join(dir, n), 'utf8'),
    }))
  );
  return { source: 'files', reports };
}

export async function GET() {
  const viaDb = await fromSupabase().catch(() => null);
  const data = viaDb ?? (await fromFiles());
  return Response.json(data);
}
