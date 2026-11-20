-- next work 札幌：一覧データ（事業所×求人の1行＝1 item）
-- 再投入は id で upsert する（load-d1.mjs）

CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL,
  ward TEXT NOT NULL DEFAULT '',
  wam_no TEXT,
  has_job INTEGER NOT NULL DEFAULT 0,
  days_min INTEGER,
  emp TEXT NOT NULL DEFAULT '',
  wage_type TEXT NOT NULL DEFAULT '',
  -- 画面用の完全な1件分（site の NW_DATA.items[] と同形）
  json TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_items_type ON items(type);
CREATE INDEX IF NOT EXISTS idx_items_ward ON items(ward);
CREATE INDEX IF NOT EXISTS idx_items_has_job ON items(has_job);
