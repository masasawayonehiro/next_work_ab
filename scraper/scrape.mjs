// ハローワークインターネットサービスから障害者求人を取得してCSVに出力する
// 使い方: node scrape.mjs [件数=全件] [フリーワード(省略可)]
// 札幌市（全区）の障害者求人を一覧の先頭から順に開き、output/raw/hellowork_jobs.csv に出力する
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const LIMIT = process.argv[2] ? Number(process.argv[2]) : Infinity;
const FREE_WORD = process.argv[3] ?? '';
const CITY_CHECKBOX = '#ID_skCheck0119011'; // 北海道 > 札幌市
const WAIT_MS = 2000; // サイトに負荷をかけないよう、1件ごとに待つ
const BASE = 'https://www.hellowork.mhlw.go.jp/kensaku/';
const ENTRY = BASE + 'GECA110010.do?action=initDisp&screenId=GECA110010';

// CSVの列名 → 詳細ページの要素ID（複数あれば結合）
const FIELDS = {
  '職種': ['sksu'],
  '仕事の内容': ['shigotoNy'],
  '事業所名': ['jgshMei'],
  '就業場所': ['shgBsJusho'],
  '賃金': ['chgn'],
  '賃金形態': ['chgnKeitaiToKbn'],
  '就業時間': ['shgJn1', 'shgJn2', 'shgJn3', 'shgJiknTkjk'],
  '休日': ['kyjs', 'shukFtskSei', 'nenjiYukyu'],
  '求人番号': ['kjNo'],
  '求人数': ['saiyoNinsu'],
  // ---- 追加項目 ----
  '受付年月日': ['uktkYmd'],
  '紹介期限日': ['shkiKigenHi'],
  '受理安定所': ['juriAtsh'],
  '求人区分': ['kjKbn'],
  '雇用形態': ['koyoKeitai'],
  '雇用期間': ['koyoKikan'],
  '週所定労働日数': ['shuRdNisu'],
  '加入保険': ['knyHoken'],
  '通勤手当': ['tsknTat'],
  'マイカー通勤': ['mycarTskn'],
  '最寄り駅': ['shgBsMyorEki'],
  '駅からの交通手段': ['shgBsKotsuShudan', 'shgBsShyoJn'],
  '試用期間': ['trialKikan', 'trialKikanKikan'],
  '必要な経験': ['hynaKiknt'],
  '必要な資格': ['hynaMenkyoSkku'],
  '年齢': ['nenrei'],
  '事業内容': ['jigyoNy'],
  '求人に関する特記事項': ['kjTkjk'],
  '事業所番号': ['jgshNo'],
  '法人番号': ['hoNinNo'], // WAM NETのオープンデータと結び付けるのに使う
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const csvCell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

async function search(page) {
  await page.goto(ENTRY, { waitUntil: 'domcontentloaded' });
  await page.click('#ID_LkjKbnRadioBtn5'); // 障害のある方のための求人
  await page.click('#ID_todohukenHiddenAccoBtn');
  await page.waitForTimeout(500);
  await page.evaluate((sel) => {
    const c = document.querySelector(sel);
    c.checked = true;
    window.$(c).trigger('change');
  }, CITY_CHECKBOX);
  await page.click('#ID_ok4');
  if (FREE_WORD) await page.fill('#ID_freeWordInput', FREE_WORD);
  await Promise.all([page.waitForLoadState('domcontentloaded'), page.click('#ID_searchBtn')]);
  await page.waitForSelector('#ID_kyujinkensu', { state: 'attached' });
  return Number(await page.inputValue('#ID_kyujinkensu'));
}

// 一覧を1ページずつめくりながら、詳細ページのURLを順に返す
async function* detailUrls(page) {
  const seen = new Set();
  while (true) {
    const hrefs = await page.$$eval('a[href*="action=dispDetailBtn"]', (as) => as.map((a) => a.href));
    for (const h of hrefs) {
      if (!seen.has(h)) {
        seen.add(h);
        yield h;
      }
    }
    const next = page.locator('input[name="fwListNaviBtnNext"]:not([disabled])').first();
    if ((await next.count()) === 0) return;
    await sleep(WAIT_MS);
    // ページ送り直後は求人が0件の途中状態になることがあり、そこで進むとページを飛ばしてしまう。
    // 「現在のページ番号」が次の番号になり、求人リンクが表示されるまで待つ
    const expected = (await currentPageNo(page)) + 1;
    await next.click();
    await page.waitForFunction(
      (n) => {
        const cur = [...document.querySelectorAll('input[name^="fwListNaviBtn"][disabled]')]
          .map((e) => Number(e.value.replace(/\D/g, ''))).find((v) => v > 0);
        return cur === n && document.querySelector('a[href*="action=dispDetailBtn"]');
      },
      expected,
      { timeout: 60000 },
    );
    await page.waitForLoadState('load');
  }
}

async function currentPageNo(page) {
  const vals = await page.$$eval('input[name^="fwListNaviBtn"][disabled]', (es) => es.map((e) => e.value));
  return vals.map((v) => Number(v.replace(/\D/g, ''))).find((v) => v > 0) ?? 1;
}

async function scrapeDetail(page, url) {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const texts = await page.evaluate(() => {
    const out = {};
    for (const el of document.querySelectorAll('[id^="ID_"]')) {
      const key = el.id.slice(3);
      if (!(key in out)) out[key] = el.innerText.trim(); // 同じIDは最初のものを使う
    }
    return out;
  });
  const row = {};
  for (const [col, ids] of Object.entries(FIELDS)) {
    row[col] = ids.map((id) => texts[id]).filter((t) => t && t !== '-').join(' / ');
  }
  // A型/B型: 「就労継続支援A型事業所」欄が「該当」ならA型
  const all = Object.values(texts).join('\n');
  row['A型/B型'] = texts.srKeizokuShienAaKata === '該当' ? 'A型' : /B型|Ｂ型/.test(all) ? 'B型?' : '';
  row['求人票URL'] = url;
  row['取得日時'] = new Date().toISOString();
  return row;
}

const browser = await chromium.launch();
const listPage = await browser.newPage(); // 一覧はこのタブで保持
// 詳細は別コンテキスト（別セッション）で開く。同じセッションで開くと一覧のページ送りが崩れるため
const detailPage = await (await browser.newContext()).newPage();
const rows = [];
let checked = 0;
try {
  const total = await search(listPage);
  console.log(`検索結果: ${total}件`);
  for await (const url of detailUrls(listPage)) {
    checked++;
    await sleep(WAIT_MS);
    try {
      const row = await scrapeDetail(detailPage, url);
      const name = row['事業所名'].replace(/\s+/g, ' ');
      console.log(`[${checked}/${total}] ${row['A型/B型'] || '-'} ${row['求人番号']} ${name}`);
      rows.push(row);
    } catch (e) {
      console.error(`[${checked}/${total}] 失敗: ${url}\n  ${e.message}`);
    }
    if (rows.length >= LIMIT) break;
  }
} finally {
  await browser.close();
}

const cols = ['職種', '仕事の内容', 'A型/B型', '事業所名', '就業場所', '賃金', '就業時間', '休日', '求人番号', '求人数', '求人票URL',
  ...Object.keys(FIELDS).filter((c) => !['職種', '仕事の内容', '事業所名', '就業場所', '賃金', '就業時間', '休日', '求人番号', '求人数'].includes(c)),
  '取得日時'];
const csv = '﻿' + [cols.map(csvCell).join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\r\n');
fs.mkdirSync(path.join('output', 'raw'), { recursive: true });
const file = path.join('output', 'raw', 'hellowork_jobs.csv');
fs.writeFileSync(file, csv);
console.log(`\n${checked}件を確認し、${rows.length}件を ${file} に保存しました`);
