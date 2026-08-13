#!/usr/bin/env python3
"""
競品動態監控器 — 每週自動抓 RSS → AI 摘要 → commit markdown
"""

import os
import json
import yaml
import feedparser
from datetime import datetime, timedelta
from pathlib import Path

def load_config():
    with open("config.yaml") as f:
        return yaml.safe_load(f)

def fetch_recent_articles(feed_url, days=7):
    """抓最近 N 天的文章"""
    feed = feedparser.parse(feed_url)
    cutoff = datetime.now() - timedelta(days=days)
    articles = []
    for entry in feed.entries[:10]:  # 最多取 10 篇
        published = entry.get("published_parsed") or entry.get("updated_parsed")
        if published:
            pub_date = datetime(*published[:6])
            if pub_date < cutoff:
                continue
        articles.append({
            "title": entry.get("title", "Untitled"),
            "link": entry.get("link", ""),
            "summary": entry.get("summary", "")[:200],
            "date": pub_date.strftime("%Y-%m-%d") if published else "unknown"
        })
    return articles

def ai_summarize(articles_text):
    """用 Groq API 產中文摘要"""
    api_key = os.environ.get("GROQ_API_KEY")
    if not api_key:
        return "⚠️ 沒有 GROQ_API_KEY，跳過 AI 摘要"

    import urllib.request

    body = json.dumps({
        "model": "llama-3.3-70b-versatile",
        "messages": [
            {"role": "system", "content": "你是一位科技產業分析師。用繁體中文整理以下競品動態，每篇 2-3 句重點摘要。"},
            {"role": "user", "content": articles_text}
        ],
        "max_tokens": 1500
    }).encode()

    req = urllib.request.Request(
        "https://api.groq.com/openai/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": "ai-workflow-demo/1.0"
        }
    )

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read())
            return data["choices"][0]["message"]["content"]
    except Exception as e:
        return f"⚠️ AI 摘要失敗：{e}"

def generate_report(config):
    """產出週報 markdown"""
    now = datetime.now()
    week_num = now.strftime("%Y-W%W")

    all_articles = []
    sections = []

    for feed in config["feeds"]:
        # 一個來源抓不到，不可以讓整份週報跟著消失 —— 其他來源照樣要出。
        # 網站當機、改網址、憑證過期都會走到這裡，而那時候你正在睡覺。
        try:
            articles = fetch_recent_articles(feed["url"])
            failed = None
        except Exception as exc:
            articles, failed = [], exc
        all_articles.extend(articles)

        section = f"## {feed['name']}\n\n"
        if failed:
            section += f"_這個來源今天抓不到：{failed}_\n"
        elif not articles:
            section += "_本週無新文章_\n"
        else:
            for a in articles:
                section += f"- **{a['title']}** ({a['date']})\n  {a['link']}\n"
        sections.append(section)

    # AI 摘要
    if all_articles:
        articles_text = "\n".join([f"- {a['title']}: {a['summary']}" for a in all_articles])
        ai_summary = ai_summarize(articles_text)
    else:
        ai_summary = "_本週無新文章_"

    # 組合 markdown
    report = f"""# 競品動態週報 {week_num}

> 自動產出於 {now.strftime('%Y-%m-%d %H:%M')} (UTC)
> 追蹤 {len(config['feeds'])} 個來源，本週共 {len(all_articles)} 篇新文章

---

## AI 摘要

{ai_summary}

---

{"".join(sections)}
"""

    # 寫檔
    output_dir = Path(config["output"]["dir"])
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / f"{week_num}.md"
    output_file.write_text(report, encoding="utf-8")
    print(f"✅ 報告產出：{output_file}")
    return str(output_file)

if __name__ == "__main__":
    config = load_config()
    generate_report(config)
