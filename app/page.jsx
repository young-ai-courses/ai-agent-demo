'use client';

import { useEffect, useState } from 'react';

// 這是使用者看得到的畫面，做三件事：
//   ① 把第一堂自動產出的週報顯示出來（原本只躺在 repo 裡，沒人看得到）
//   ② 讓你對這些週報問問題
//   ③ 把問題送到 /api/ai（伺服器端，key 在那裡）
//
// 注意：這裡完全沒有 API key。key 只存在伺服器端那支 route，
// 因為這個檔案的內容任何人打開瀏覽器原始碼就看得到。

const C = {
  ink: '#141414', mid: '#4a4a48', mut: '#8b8b84',
  acc: '#e8590c', accd: '#c2410c', sf: '#fdefe4', neu: '#f2f0ec', line: '#e6e3dc',
};

const SAMPLES = [
  '這幾週競品最常出現的主題是什麼？',
  '有哪些跟 AI agent 有關的動態？',
  '最近一週跟上一週比，變化在哪？',
];

export default function Home() {
  const [reports, setReports] = useState([]);
  const [source, setSource] = useState('');
  const [open, setOpen] = useState(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/reports')
      .then((r) => r.json())
      .then((d) => {
        setReports(d.reports || []);
        setSource(d.source || 'none');
        if (d.reports?.length) setOpen(d.reports[0].week);
      })
      .catch(() => setSource('none'));
  }, []);

  async function ask(e) {
    e.preventDefault();
    setLoading(true); setError(''); setAnswer('');
    try {
      const context = reports.map((r) => `## ${r.week}\n${r.content}`).join('\n\n');
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, context }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error || `發生錯誤（${res.status}）`);
      else setAnswer(data.output);
    } catch (err) {
      setError(`連線失敗：${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  const [syncMsg, setSyncMsg] = useState('');
  async function sync() {
    setSyncMsg('同步中…');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const d = await res.json();
      setSyncMsg(res.ok ? `已存進資料庫：${d.weeks?.join('、')}` : (d.hint || d.error));
      if (res.ok) {
        const r = await (await fetch('/api/reports')).json();
        setReports(r.reports || []); setSource(r.source || '');
      }
    } catch (err) { setSyncMsg(`同步失敗：${err.message}`); }
  }

  const sourceLabel = { supabase: '資料庫（Supabase）', files: 'repo 裡的檔案', none: '還沒有週報' }[source] || '';

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '3rem 1.5rem 5rem',
                   fontFamily: '"Helvetica Neue","Noto Sans TC",sans-serif', color: C.ink }}>
      <h1 style={{ fontSize: '2rem', margin: 0, letterSpacing: '-.02em' }}>競品動態週報</h1>
      <p style={{ fontSize: '1.05rem', color: C.mid, lineHeight: 1.7, marginTop: '.6rem' }}>
        第一堂那支排程每週自動抓文章、產出週報。這一頁把它變成別人打得開的畫面，
        而且可以直接對它問問題。
      </p>
      {source && (
        <p style={{ fontSize: '.9rem', color: C.mut, marginTop: '.4rem' }}>
          資料來源：{sourceLabel}　·　{reports.length} 份週報
          {source === 'files' && reports.length > 0 && (
            <>
              {'　'}
              <button type="button" onClick={sync}
                style={{ background: 'none', border: 'none', color: C.accd, fontSize: '.9rem',
                         cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                同步到資料庫
              </button>
            </>
          )}
          {syncMsg && <span style={{ color: C.accd }}>{'　'}{syncMsg}</span>}
        </p>
      )}

      {/* ── 問答 ── */}
      <form onSubmit={ask} style={{ marginTop: '2rem' }}>
        <label style={{ display: 'block', fontWeight: 700, marginBottom: '.6rem' }}>
          問它一個問題
        </label>
        <div style={{ display: 'flex', gap: '.6rem', flexWrap: 'wrap' }}>
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="例如：這幾週競品最常出現的主題是什麼？"
            style={{ flex: '1 1 320px', padding: '.85rem 1rem', fontSize: '1rem',
                     border: `1.5px solid ${C.line}`, borderRadius: 8, fontFamily: 'inherit' }}
          />
          <button type="submit" disabled={loading || !question.trim() || !reports.length}
            style={{ background: loading || !question.trim() || !reports.length ? '#c9c6bf' : C.acc,
                     color: '#fff', border: 'none', borderRadius: 6, padding: '.85rem 1.6rem',
                     fontSize: '1rem', fontWeight: 700,
                     cursor: loading || !question.trim() ? 'default' : 'pointer' }}>
            {loading ? '想一下…' : '問'}
          </button>
        </div>
        <div style={{ marginTop: '.7rem', display: 'flex', gap: '.8rem', flexWrap: 'wrap' }}>
          {SAMPLES.map((s) => (
            <button key={s} type="button" onClick={() => setQuestion(s)}
              style={{ background: 'none', border: 'none', color: C.accd, fontSize: '.92rem',
                       cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
              {s}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div style={{ marginTop: '1.4rem', padding: '1rem 1.2rem', background: C.sf,
                      borderLeft: `4px solid ${C.acc}`, borderRadius: 4, lineHeight: 1.7 }}>
          {error}
        </div>
      )}
      {answer && (
        <pre style={{ marginTop: '1.4rem', padding: '1.2rem', background: C.neu, borderRadius: 8,
                      whiteSpace: 'pre-wrap', fontSize: '.98rem', lineHeight: 1.75,
                      fontFamily: 'inherit' }}>{answer}</pre>
      )}

      {/* ── 週報列表 ── */}
      <h2 style={{ fontSize: '1.3rem', marginTop: '2.8rem', paddingTop: '1.6rem',
                   borderTop: `2px solid ${C.ink}` }}>每一週的週報</h2>
      {!reports.length && (
        <p style={{ color: C.mid, lineHeight: 1.8, marginTop: '.8rem' }}>
          還沒有週報。到你 repo 的 <strong>Actions</strong> 分頁 →
          <strong>Weekly Competitor Digest</strong> → <strong>Run workflow</strong> 跑一次，
          等 15–30 秒再重新整理這一頁。
        </p>
      )}
      {reports.map((r) => (
        <section key={r.week} style={{ marginTop: '1rem', border: `1.5px solid ${C.line}`,
                                       borderRadius: 8, overflow: 'hidden' }}>
          <button onClick={() => setOpen(open === r.week ? null : r.week)}
            style={{ width: '100%', textAlign: 'left', padding: '.9rem 1.1rem',
                     background: open === r.week ? C.sf : '#fff', border: 'none',
                     fontSize: '1.02rem', fontWeight: 700, cursor: 'pointer',
                     fontFamily: 'inherit', color: C.ink }}>
            {open === r.week ? '▾' : '▸'} {r.week}
          </button>
          {open === r.week && (
            <pre style={{ margin: 0, padding: '1rem 1.1rem', whiteSpace: 'pre-wrap',
                          fontSize: '.92rem', lineHeight: 1.7, fontFamily: 'inherit',
                          color: C.mid, borderTop: `1px solid ${C.line}` }}>{r.content}</pre>
          )}
        </section>
      ))}
    </main>
  );
}
