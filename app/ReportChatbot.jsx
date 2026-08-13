'use client';

import { useEffect, useState } from 'react';

const colors = {
  ink: '#171717',
  text: '#3f3f3f',
  muted: '#737373',
  line: '#dedbd4',
  surface: '#faf8f3',
  accent: '#d97706',
  accentDark: '#b45309',
};

export default function ReportChatbot({ reports }) {
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [storage, setStorage] = useState('checking');

  useEffect(() => {
    const key = 'weekly-report-chat-session-id';
    const existing = window.localStorage.getItem(key);
    const id =
      existing ||
      (window.crypto?.randomUUID
        ? window.crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

    window.localStorage.setItem(key, id);
    setSessionId(id);

    fetch(`/api/chat-history?session_id=${encodeURIComponent(id)}`)
      .then((response) => response.json())
      .then((data) => {
        setStorage(data.storage || 'disabled');
        if (Array.isArray(data.messages)) setMessages(data.messages);
      })
      .catch(() => setStorage('disabled'));
  }, []);

  async function saveMessage(message) {
    if (!sessionId) return;
    try {
      const response = await fetch('/api/chat-history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          role: message.role,
          content: message.content,
        }),
      });
      const data = await response.json();
      setStorage(data.storage || (response.ok ? 'supabase' : 'disabled'));
    } catch {
      setStorage('disabled');
    }
  }

  async function ask(e) {
    e.preventDefault();
    const cleanQuestion = question.trim();
    if (!cleanQuestion || loading) return;

    setLoading(true);
    setError('');
    const userMessage = { role: 'user', content: cleanQuestion };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setQuestion('');
    saveMessage(userMessage);

    try {
      const context = reports
        .map((report) => `## ${report.title}\n${report.content}`)
        .join('\n\n');

      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: cleanQuestion,
          context,
          history: messages.slice(-6),
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || `發生錯誤：${response.status}`);
        return;
      }

      const assistantMessage = { role: 'assistant', content: data.output || 'AI 沒有回傳內容' };
      setMessages([...nextMessages, assistantMessage]);
      saveMessage(assistantMessage);
    } catch (err) {
      setError(`連線失敗：${err.message}`);
      setMessages(messages);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      style={{
        marginTop: 28,
        padding: 20,
        border: `1px solid ${colors.line}`,
        borderRadius: 8,
        background: colors.surface,
      }}
    >
      <h2 style={{ margin: 0, fontSize: 22, lineHeight: 1.35 }}>科技產業分析助理</h2>
      <p style={{ margin: '8px 0 0', color: colors.muted, fontSize: 14 }}>
        {storage === 'supabase'
          ? '已記住這台瀏覽器的對話'
          : storage === 'checking'
            ? '正在讀取之前的對話'
            : '尚未連上對話紀錄資料庫'}
      </p>
      <form onSubmit={ask} style={{ marginTop: 16 }}>
        <label
          htmlFor="report-question"
          style={{ display: 'block', color: colors.text, fontWeight: 700, marginBottom: 8 }}
        >
          問週報一個問題
        </label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input
            id="report-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="例如：這幾週 AI agent 有哪些動態？"
            disabled={!reports.length || loading}
            style={{
              flex: '1 1 300px',
              minHeight: 44,
              padding: '0 12px',
              border: `1px solid ${colors.line}`,
              borderRadius: 6,
              fontSize: 16,
              fontFamily: 'inherit',
              color: colors.ink,
              background: '#fff',
            }}
          />
          <button
            type="submit"
            disabled={!reports.length || !question.trim() || loading}
            style={{
              minHeight: 44,
              padding: '0 18px',
              border: 0,
              borderRadius: 6,
              background: !reports.length || !question.trim() || loading ? '#c7c2b8' : colors.accent,
              color: '#fff',
              fontSize: 16,
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: !reports.length || !question.trim() || loading ? 'default' : 'pointer',
            }}
          >
            {loading ? '分析中' : '送出'}
          </button>
        </div>
      </form>

      {error && (
        <div
          style={{
            marginTop: 16,
            padding: 14,
            borderLeft: `4px solid ${colors.accentDark}`,
            background: '#fff',
            color: colors.text,
            lineHeight: 1.7,
          }}
      >
        {error}
      </div>
      )}

      {messages.length > 0 && (
        <div
          style={{
            margin: '16px 0 0',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {messages.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              style={{
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: 'min(100%, 720px)',
                padding: '12px 14px',
                border: `1px solid ${colors.line}`,
                borderRadius: 8,
                background: message.role === 'user' ? colors.accent : '#fff',
                color: message.role === 'user' ? '#fff' : colors.text,
                whiteSpace: 'pre-wrap',
                overflowWrap: 'anywhere',
                fontSize: 15,
                lineHeight: 1.7,
              }}
            >
              {message.content}
            </div>
          ))}
          {loading && (
            <div
              style={{
                alignSelf: 'flex-start',
                padding: '12px 14px',
                border: `1px solid ${colors.line}`,
                borderRadius: 8,
                background: '#fff',
                color: colors.muted,
                fontSize: 15,
              }}
            >
              分析中
            </div>
          )}
        </div>
      )}

      {!reports.length && (
        <p style={{ margin: '12px 0 0', color: colors.muted, lineHeight: 1.7 }}>
          目前沒有週報，所以 chatbot 還不能回答
        </p>
      )}
    </section>
  );
}
