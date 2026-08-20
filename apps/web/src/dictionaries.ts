import { lang } from "next/root-params";
import { notFound } from "next/navigation";

/**
 * 語系字典。刻意不引入 i18n 套件 —— landing 與登入頁的文案量小，
 * 官方的 dictionary 模式就夠用，日後若需要複數規則或日期格式再評估 next-intl。
 */
const dictionaries = {
	"en": () => import("@/dictionaries/en.json").then((m) => m.default),
	"zh-TW": () => import("@/dictionaries/zh-TW.json").then((m) => m.default),
};

export type Locale = keyof typeof dictionaries;
export type Dictionary = Awaited<ReturnType<(typeof dictionaries)["en"]>>;

export const locales = Object.keys(dictionaries) as Locale[];
export const defaultLocale: Locale = "en";

export const hasLocale = (value: string | undefined): value is Locale =>
	typeof value === "string" && value in dictionaries;

/**
 * 從 root param 讀取語系，呼叫端不需要傳 lang。
 * 僅能在 Server Component 或 server-side utility 使用。
 */
export const getDictionary = async (): Promise<Dictionary> => {
	const locale = await lang();
	if (!hasLocale(locale)) notFound();
	return dictionaries[locale]();
};

export const getLocale = async (): Promise<Locale> => {
	const locale = await lang();
	if (!hasLocale(locale)) notFound();
	return locale;
};
