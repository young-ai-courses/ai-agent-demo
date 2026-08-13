import fs from 'node:fs/promises';
import path from 'node:path';
import ReportChatbot from './ReportChatbot';

const colors = {
  ink: '#171717',
  text: '#3f3f3f',
  muted: '#737373',
  line: '#dedbd4',
  surface: '#faf8f3',
  accent: '#d97706',
};

async function getReports() {
  const dir = path.join(process.cwd(), 'reports', 'weekly');

  let names = [];
  try {
    names = await fs.readdir(dir);
  } catch {
    return [];
  }

  const markdownFiles = names
    .filter((name) => name.endsWith('.md'))
    .sort()
    .reverse();

  return Promise.all(
    markdownFiles.map(async (name) => ({
      id: name.replace(/\.md$/, ''),
      title: name.replace(/\.md$/, ''),
      content: await fs.readFile(path.join(dir, name), 'utf8'),
    }))
  );
}

export default async function Home() {
  const reports = await getReports();

  return (
    <main
      style={{
        maxWidth: 920,
        margin: '0 auto',
        padding: '48px 20px 80px',
        fontFamily: '"Helvetica Neue", "Noto Sans TC", Arial, sans-serif',
        color: colors.ink,
      }}
    >
      <header style={{ borderBottom: `2px solid ${colors.ink}`, paddingBottom: 24 }}>
        <p
          style={{
            margin: '0 0 10px',
            color: colors.accent,
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          reports/weekly
        </p>
        <h1 style={{ margin: 0, fontSize: 34, lineHeight: 1.2 }}>
          競品動態週報
        </h1>
        <p style={{ margin: '12px 0 0', color: colors.text, fontSize: 17, lineHeight: 1.7 }}>
          GitHub Actions 每週自動產出的週報會出現在這裡，由新到舊排列，點標題就能展開閱讀
        </p>
      </header>

      <ReportChatbot reports={reports} />

      <section style={{ marginTop: 28 }}>
        <p style={{ margin: '0 0 18px', color: colors.muted, fontSize: 15 }}>
          目前共有 {reports.length} 份週報
        </p>

        {reports.length === 0 ? (
          <div
            style={{
              background: colors.surface,
              border: `1px solid ${colors.line}`,
              borderRadius: 8,
              padding: 20,
              color: colors.text,
              lineHeight: 1.7,
            }}
          >
            還沒有找到週報檔案。等 GitHub Actions 產出 `reports/weekly/*.md` 後，這裡就會自動列出來
          </div>
        ) : (
          reports.map((report, index) => (
            <details
              key={report.id}
              open={index === 0}
              style={{
                border: `1px solid ${colors.line}`,
                borderRadius: 8,
                overflow: 'hidden',
                marginTop: 14,
                background: '#fff',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  padding: '16px 18px',
                  fontWeight: 700,
                  fontSize: 18,
                  background: index === 0 ? colors.surface : '#fff',
                }}
              >
                {report.title}
              </summary>
              <pre
                style={{
                  margin: 0,
                  borderTop: `1px solid ${colors.line}`,
                  padding: '18px',
                  whiteSpace: 'pre-wrap',
                  overflowWrap: 'anywhere',
                  color: colors.text,
                  fontFamily: '"Helvetica Neue", "Noto Sans TC", Arial, sans-serif',
                  fontSize: 15,
                  lineHeight: 1.75,
                  background: '#fff',
                }}
              >
                {report.content}
              </pre>
            </details>
          ))
        )}
      </section>
    </main>
  );
}
