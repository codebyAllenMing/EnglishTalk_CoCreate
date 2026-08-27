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

/** Date → "YYYY-MM-DD"。不用 toISOString，那會先轉 UTC 而在台灣時間的凌晨倒退一天。 */
function toISODate(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, "0");
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** 本週的星期一。getDay() 週日是 0，所以週日要往回推 6 天而不是往前 1 天。 */
export function currentWeekStart(): string {
	const now = new Date();
	const day = now.getDay();
	const monday = new Date(now);
	monday.setDate(now.getDate() + (day === 0 ? -6 : 1 - day));
	return toISODate(monday);
}

/** 今天落在該週的第幾欄（週一 = 0）。不在該週內回傳 -1，表頭就不會有任何高亮。 */
export function todayIndexIn(weekStart: string): number {
	const start = parseLocalDate(weekStart);
	const today = parseLocalDate(toISODate(new Date()));
	const diff = Math.round((today.getTime() - start.getTime()) / 86_400_000);
	return diff >= 0 && diff < 7 ? diff : -1;
}
