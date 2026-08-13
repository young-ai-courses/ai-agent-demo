// 這支就是「你的網站怎麼跟 AI 說話」的地方
//
// 前端把「你的問題」＋「週報內容」送到這裡 → 這裡轉給 Groq → 把答案送回前端
//
// 為什麼不能讓前端直接打 Groq：API key 會被所有人看到（打開瀏覽器原始碼就有）。
// 所以 key 只放在這一層（伺服器端），前端永遠拿不到它。

// 👇 這就是這個 Agent 的人格與規則。改這裡 = 換一個 Agent
//
// 三個零件都在這一段裡：
//   ① 角色設定（你是誰、回答的形狀）
//   ② 判斷規則（只能根據週報回答、沒寫的不要編）
//   ③ 自我檢查（不確定的要講出來）
const SYSTEM_PROMPT = `你是一位科技產業分析助理。使用者會給你「競品動態週報」的內容，
以及一個問題。請只根據週報內容回答。

規則：
- 回答先給三行結論，再列支持它的文章標題（附週次）
- 每一個說法都要能對到週報裡的某一篇文章；對不到就不要說
- 週報裡沒提到的事情，直接說「這幾週的週報沒有提到」，不要用你自己的知識補
- 跨週比較的時候，明確講出是哪幾週`;

// 一次最多接受多長的輸入（週報全文＋問題）
//
// 為什麼要有：沒有它，一次請求就可能把免費額度的 token 燒掉一大塊。
const MAX_INPUT_CHARS = 24000;

// ⚠️ 這支 API 沒有做認證 —— 任何知道你網址的人都能用它（花的是你的額度）。
// 要對外開放最少要加：限流 rate limit、認證 auth、用量上限 quota。
export async function POST(request) {
  const { question, context, history = [] } = await request.json();

  if (!question || !question.trim()) {
    return Response.json({ error: '沒有問題內容' }, { status: 400 });
  }
  if (!context || !context.trim()) {
    return Response.json(
      { error: '還沒有任何週報可以問。先讓第一堂那支 GitHub Actions 跑一次，或去 Actions 手動 Run workflow' },
      { status: 400 }
    );
  }

  const recentHistory = Array.isArray(history)
    ? history
        .slice(-6)
        .map((message) => {
          const role = message.role === 'assistant' ? '助理' : '使用者';
          return `${role}：${String(message.content || '').slice(0, 1200)}`;
        })
        .join('\n')
    : '';

  const payload = `以下是競品動態週報：\n\n${context}\n\n---\n\n前面的對話：\n${recentHistory || '無'}\n\n---\n\n我的問題：${question}`;
  const trimmed = payload.slice(0, MAX_INPUT_CHARS);

  // key 來自環境變數，不在程式碼裡
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        error:
          '還沒設定 GROQ_API_KEY。到 Vercel 專案 → Settings → Environment Variables ' +
          '加上它，然後 Deployments → ⋯ → Redeploy（不重新部署不會生效）',
      },
      { status: 500 }
    );
  }

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        // ⚠️ 這行不能拿掉 —— 少了 User-Agent，Groq 會回 403
        'User-Agent': 'ai-agent-demo/1.0',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: trimmed },
        ],
        // 調低 = 每次結果更穩定，比較不會亂發揮
        temperature: 0.2,
        max_completion_tokens: 1200,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      return Response.json(
        { error: `Groq 回了 ${res.status}`, detail: detail.slice(0, 500) },
        { status: 502 }
      );
    }

    const data = await res.json();
    const output = data.choices?.[0]?.message?.content ?? '(AI 沒有回傳內容)';
    return Response.json({ output });
  } catch (err) {
    return Response.json({ error: `呼叫失敗：${err.message}` }, { status: 500 });
  }
}
