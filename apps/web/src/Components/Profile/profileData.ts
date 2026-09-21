import type { Dictionary } from "@/dictionaries";

/**
 * ⚠️⚠️ 假資料 ⚠️⚠️
 *
 * 後端尚未建立，個人首頁的所有數字都寫死在這裡。
 * grep "FAKE_" 可找出專案所有假內容（另有 FAKE_STATS / FAKE_TESTIMONIALS / FAKE_AUTH）。
 *
 * 語言與程度存的是代碼不是顯示字串 —— 它們是列舉值，要跟著介面語言翻譯；
 * bio 則是使用者自己寫的內容，真實情況不會 i18n，這裡放進字典純粹是為了
 * 兩種語言都能看到排版效果。
 */
export const FAKE_PROFILE = {
	name: "Allen",
	avatar: "avatar-allen",
	nativeCode: "zh",
	learningCode: "en",
	/** 學習語言的程度 —— 個人卡與 Find Monsters 顯示的是這個 */
	level: "intermediate",
	nativeLevel: "fluent",
	country: "TW",
	gender: "preferNot",
	interests: ["travel", "movies", "music", "art", "fitness"],
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
