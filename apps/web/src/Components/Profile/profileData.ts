import type { Dictionary } from "@/dictionaries";

/**
 * ⚠️⚠️ 假資料 ⚠️⚠️
 *
 * 個人資料（名字、頭像、語言、程度、國家、興趣、自介）已經走 API（見 src/profile/client.ts），
 * 這裡只剩**還沒有表**的那幾個數字：評價要等評分表、代幣要等 ledger、線上要等 WS presence、
 * 通知要等訊息系統。grep "FAKE_" 可找出專案所有假內容（另有 FAKE_STATS / FAKE_TESTIMONIALS）。
 */
export const FAKE_PROFILE = {
	reputation: 4.8,
	tokens: 320,
	online: true,
	notifications: 2,
} as const;

export type LangCode = keyof Dictionary["profile"]["lang"];
export type LevelCode = keyof Dictionary["profile"]["level"];
export type GenderCode = keyof Dictionary["profile"]["settings"]["genderOptions"];
export type InterestCode = keyof Dictionary["profile"]["settings"]["interestOptions"];
/** 只有兩個（使用者 2026-09-21：「只會有兩個國家」）。名稱由 Intl.DisplayNames 依語系產生 */
export type CountryCode = "TW" | "US";

/**
 * 語言 → 國旗。這是**語言的旗**不是使用者的 country：母語中文就是台灣旗，
 * 跟本人住哪無關。設定頁的語言欄位與個人資料卡的語言列共用。
 */
export const LANG_FLAG: Record<LangCode, CountryCode> = { zh: "TW", en: "US" };
