/**
 * GET /api/data
 * D1 に入れた一覧を、site と同じ { meta, items } 形で返す。
 * フロントは window.NW_DATA に代入してから common.js / search.js を読む。
 */

interface Env {
  DB: D1Database;
}

type MetaRow = { key: string; value: string };
type ItemRow = { json: string };

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const db = context.env.DB;
  if (!db) {
    return Response.json({ error: "D1 binding DB is missing" }, { status: 500 });
  }

  try {
    const metaRes = await db.prepare("SELECT key, value FROM meta").all<MetaRow>();
    const metaMap = new Map((metaRes.results ?? []).map((r) => [r.key, r.value]));
    let meta: Record<string, unknown> = { wards: [] };
    const snapshot = metaMap.get("snapshot");
    if (snapshot) {
      try {
        meta = JSON.parse(snapshot) as Record<string, unknown>;
      } catch {
        meta = { wards: [] };
      }
    }
    meta.updatedAt = metaMap.get("updatedAt") ?? null;
    meta.count = Number(metaMap.get("count") ?? 0) || undefined;

    const itemRes = await db.prepare("SELECT json FROM items").all<ItemRow>();
    const items = (itemRes.results ?? []).map((r) => JSON.parse(r.json));

    return Response.json(
      { meta, items },
      {
        headers: {
          "Cache-Control": "public, max-age=60, s-maxage=300",
          "Content-Type": "application/json; charset=utf-8",
        },
      },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    return Response.json({ error: "failed to read D1", detail: message }, { status: 500 });
  }
};
