/**
 * 「我的行程」是看日曆還是列表（使用者 2026-09-23：手機看週曆不友善，要能切列表）。
 *
 * 用 useSyncExternalStore 接：server snapshot 是 null（SSR 畫骨架），client 第一次讀 localStorage，
 * 沒存過就看視窗寬度 —— 手機（< lg）預設列表、桌機預設日曆。切過一次就記住。
 */
export type ScheduleView = "calendar" | "list";

const KEY = "schedule.view";
const listeners = new Set<() => void>();
let cached: ScheduleView | null = null;

function read(): ScheduleView {
	if (cached) return cached;
	try {
		const stored = localStorage.getItem(KEY);
		if (stored === "calendar" || stored === "list") {
			cached = stored;
			return stored;
		}
	} catch {
		// 無痕 / 封鎖儲存：照預設走
	}
	cached = window.matchMedia("(max-width: 1023px)").matches ? "list" : "calendar";
	return cached;
}

export function subscribe(listener: () => void) {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
}

export const getView = (): ScheduleView => read();
export const getServerView = (): ScheduleView | null => null;

export function setView(view: ScheduleView) {
	cached = view;
	try {
		localStorage.setItem(KEY, view);
	} catch {
		// 存不了就只活在這一頁
	}
	for (const listener of listeners) listener();
}
