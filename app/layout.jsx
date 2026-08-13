export const metadata = {
  title: '我的 AI Agent',
  description: '新北青年局 AI 實戰職涯營 — 學員專案',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  );
}
