# 競品動態週報 — 講師示範用

> 新北市青年局 AI 實戰職涯營｜2026-08-13 第二堂｜蔡子揚（Young）
> **這顆是課堂示範用的完成品。** 學員要動手做的是
> [ai-agent-workshop](https://github.com/young-ai-courses/ai-agent-workshop)。

## 這顆 repo 展示什麼

第一堂做的自動化**一行都沒有改**。今晚做的事全部長在它後面：

```
（第一堂，已經在跑）
GitHub Actions 每週排程 → 抓 3 個來源的文章 → AI 摘要 → 寫進 reports/weekly/*.md
                                                              │
                                                    今晚從這裡接下去
        ┌─────────────────────────┼─────────────────────────┐
   ① Vercel                  ② Supabase                ③ Groq
   給它一個畫面              每一週存進資料庫            對累積的週報問答
   別人打得開                檔案 → 可查詢的資料         十份週報不用一份份讀
```

現在裡面有 **兩週**的真實週報（`2026-W31`、`2026-W32`），所以問答可以真的做跨週比較。

## 檔案怎麼分工

| 這一層 | 檔案 | 誰做的 |
|---|---|---|
| 產出週報（排程） | `scripts/weekly_competitor_digest.py` · `config.yaml` · `.github/workflows/weekly-digest.yml` | 第一堂 |
| 畫面 | `app/page.jsx` | 第二堂 |
| 問答 | `app/api/ai/route.js` | 第二堂 |
| 讀週報（資料庫優先，沒接就讀檔） | `app/api/reports/route.js` | 第二堂 |
| 把週報存進資料庫 | `app/api/sync/route.js` | 第二堂 |

**網站就在 repo 根目錄** —— 所以 Vercel Import 不需要設 Root Directory，
而且它讀得到 `reports/weekly/`（app 放子目錄的話會讀不到，Vercel 官方明寫
「Your app will not be able to access files outside of that directory」）。

## 自己跑起來

```bash
npm install
npm run dev          # 沒有 key 也打得開，只是問答會回「還沒設定 GROQ_API_KEY」
```

要能問答：`GROQ_API_KEY` 加進 Vercel 環境變數（Production）→ Redeploy。
要存資料庫：Vercel → Integrations → Supabase，建表 SQL 與 RLS policy 見
[ai-agent-workshop 的 QUICKSTART 工單 4](https://github.com/young-ai-courses/ai-agent-workshop/blob/main/QUICKSTART.md)。

> 🔴 Groq key 與 Supabase 的 anon key 性質不同：Groq key **絕不能到前端**（所以只在
> `app/api/` 裡讀 `process.env`）；Supabase 的 anon key 本來就會出現在前端，
> 它不是秘密 —— 真正的邊界是 **RLS ＋ 最小權限 policy**。

## 課堂上的示範順序

1. 打開這個網址 → 兩週的週報都在，先按一個範例問題，讓他們看到終點
2. 回到 `reports/weekly/` → 「這些是上週那支排程自己寫進來的，我沒有手動貼過」
3. 從學員的 fork 開始，現場走一次：Import → 加 key → Deploy → 打開網址
4. 接 Supabase → 按「同步到資料庫」→ 資料來源從「檔案」變成「資料庫」
5. 最後回到問答：跨兩週問一次，指出它的每個說法都對得到某一篇文章
