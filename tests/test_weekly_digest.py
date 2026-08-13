"""這三條鎖住課程投影片上點名的三顆雷。

投影片教「約束層的每一句，各拆掉一顆雷」，所以這個 repo 自己得先做到，
不然學員 fork 回去會看到教材跟實作對不上。

跑法：
    python3 -m unittest discover -s tests -v
"""
import os
import sys
import unittest
from datetime import datetime
from pathlib import Path
from unittest import mock

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "scripts"))
import weekly_competitor_digest as digest  # noqa: E402


def _entry(title, days_ago=0):
    """一筆 feedparser 風格的文章。"""
    d = datetime.now()
    return {
        "title": title,
        "link": f"https://example.test/{title}",
        "summary": "x" * 500,
        "published_parsed": (d.year, d.month, d.day - days_ago, 0, 0, 0, 0, 0, 0),
    }


class FakeFeed:
    def __init__(self, entries):
        self.entries = entries


class SingleSourceFailureIsContained(unittest.TestCase):
    """一個來源掛掉，其他來源照樣要產出 —— 不可以整支 fail。

    這是投影片上第四顆雷：「一個網站掛掉全沒了」。
    """

    def test_one_broken_feed_does_not_kill_the_run(self):
        def parse(url):
            if "broken" in url:
                raise OSError("connection reset by peer")
            return FakeFeed([_entry("good-article")])

        config = {
            "feeds": [
                {"name": "Broken", "url": "https://broken.test/feed"},
                {"name": "Working", "url": "https://working.test/feed"},
            ],
            "output": {"dir": self.tmp},
        }
        with mock.patch.object(digest.feedparser, "parse", side_effect=parse):
            path = digest.generate_report(config)

        body = Path(path).read_text(encoding="utf-8")
        self.assertIn("Working", body, "沒掛的來源必須照樣出現在報告裡")
        self.assertIn("good-article", body, "沒掛的來源的文章不可以跟著消失")

    def setUp(self):
        import tempfile
        self.tmp = tempfile.mkdtemp()


class MissingApiKeyDegradesInsteadOfCrashing(unittest.TestCase):
    """還沒設 GROQ_API_KEY 就先跑，要能跑完並說明原因。

    投影片第五顆雷：學員回去一定會在設 Secret 之前先跑一次，
    那時候 crash 他會以為是程式壞了。
    """

    def test_summary_explains_itself_when_key_is_absent(self):
        with mock.patch.dict(os.environ, {}, clear=True):
            out = digest.ai_summarize("some articles")
        self.assertIn("GROQ_API_KEY", out, "要講出缺的是哪一個環境變數")

    def test_report_is_still_written_without_a_key(self):
        import tempfile
        config = {
            "feeds": [{"name": "Working", "url": "https://working.test/feed"}],
            "output": {"dir": tempfile.mkdtemp()},
        }
        with mock.patch.object(
            digest.feedparser, "parse", return_value=FakeFeed([_entry("a")])
        ), mock.patch.dict(os.environ, {}, clear=True):
            path = digest.generate_report(config)
        self.assertTrue(Path(path).exists(), "沒有金鑰也必須產出報告")


class ReportFilenameIsWeekStamped(unittest.TestCase):
    """檔名要能一眼看出是哪一週，而且不會蓋掉上一週的。"""

    def test_filename_carries_year_and_week(self):
        import tempfile
        config = {
            "feeds": [{"name": "Working", "url": "https://working.test/feed"}],
            "output": {"dir": tempfile.mkdtemp()},
        }
        with mock.patch.object(
            digest.feedparser, "parse", return_value=FakeFeed([_entry("a")])
        ):
            path = digest.generate_report(config)
        self.assertRegex(
            Path(path).name,
            r"^\d{4}-W\d{2}\.md$",
            "檔名要是 YYYY-Www.md，週數變了才不會覆蓋上一份",
        )


if __name__ == "__main__":
    unittest.main()
