/**
 * 週曆的日期計算。純函式，不碰 React，也不碰時區換算。
 *
 * ⚠️ 解析日期字串刻意不用 `new Date("2025-05-19")` —— 那個格式會被當成 **UTC 午夜**，
 *    在 UTC-5 的瀏覽器上會倒退成 5/18。拆成年月日交給 Date 建構子才是本地時間。
 *
 * 星期與月份的文字交給 Intl 產生，不自己維護對照表：英文得到 Mon / May 19，
 * 中文自動變成 週一 / 5月19日，多一個語系也不用改這裡。
 */
export type WeekDay = {
	/** 週一起算的 0–6 */
	index: number;
	/** 短星期，例：Mon、週一 */
	weekday: string;
	/** 月日，例：May 19、5月19日 */
	dayMonth: string;
};

export function parseLocalDate(iso: string): Date {
	const [y, m, d] = iso.split("-").map(Number);
	return new Date(y, m - 1, d);
}

export function buildWeek(weekStart: string, locale: string): WeekDay[] {
	const base = parseLocalDate(weekStart);
	const weekdayFmt = new Intl.DateTimeFormat(locale, { weekday: "short" });
	const dayMonthFmt = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" });

	return Array.from({ length: 7 }, (_, index) => {
		const date = new Date(base);
		date.setDate(base.getDate() + index);
		return {
			index,
			weekday: weekdayFmt.format(date),
			dayMonth: dayMonthFmt.format(date),
		};
	});
}

/** "16:30" → 990。網格定位要的是這個數字，不是 Date。 */
export function toMinutes(time: string): number {
	const [h, m] = time.split(":").map(Number);
	return h * 60 + m;
}

/**
 * 990 → "4:30 PM" / "下午4:30"。
 * 用一個固定日期當載體 —— Intl 沒有「只格式化時間」的入口，一定要餵 Date。
 */
export function formatTime(minutes: number, locale: string): string {
	const d = new Date(2000, 0, 1, Math.floor(minutes / 60), minutes % 60);
	return new Intl.DateTimeFormat(locale, { hour: "numeric", minute: "2-digit" }).format(d);
}
