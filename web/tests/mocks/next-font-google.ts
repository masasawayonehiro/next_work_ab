/**
 * Vitest 用の next/font/google モック。
 * 結合テストで layout を import したとき、フォント読み込み関数が実環境向けのため落ちるのを防ぐ。
 */
function mockFont(variable: string) {
  return () => ({
    className: "",
    style: { fontFamily: "mock" },
    variable,
  });
}

export const Noto_Sans_JP = mockFont("--nw-font-body");
export const Zen_Maru_Gothic = mockFont("--nw-font-round");
export const Quicksand = mockFont("--nw-font-latin");
export const M_PLUS_1 = mockFont("--font-body");
export const Zen_Kaku_Gothic_New = mockFont("--font-display");
