import {
	CalendarDays,
	Ghost,
	Home,
	MessageCircle,
	Settings,
	ShieldCheck,
	Users,
	type LucideIcon,
} from "lucide-react";
import type { Dictionary } from "@/dictionaries";

type NavItem = {
	key: keyof Dictionary["profile"]["nav"];
	icon: LucideIcon;
	/** 手機版底部 tab bar 只放得下 5 項，其餘只在桌機側邊欄出現 */
	inTabBar: boolean;
};

/**
 * 側邊欄與底部 tab bar 共用同一份定義 —— 兩者是同一組導覽的兩種呈現，
 * 分開維護遲早會漂移（少一項、順序不同、icon 不一致）。
 *
 * ⚠️ 七項全部是純視覺，不給連結 —— 對應的頁面都還不存在，
 *    照專案既有決策「不存在的頁面不給連結、不做任何轉導」。
 *    只有第一項是當前頁。
 *
 * Find Monsters 用 Ghost 而不是形狀更接近設計稿的 Cat：那個 icon 代表的是
 * 「找怪獸」這件事，語意優先於外形相似。
 */
export const NAV_ITEMS: readonly NavItem[] = [
	{ key: "home", icon: Home, inTabBar: true },
	{ key: "schedule", icon: CalendarDays, inTabBar: true },
	{ key: "monsters", icon: Ghost, inTabBar: true },
	{ key: "rooms", icon: Users, inTabBar: false },
	{ key: "messages", icon: MessageCircle, inTabBar: true },
	{ key: "reputation", icon: ShieldCheck, inTabBar: false },
	{ key: "settings", icon: Settings, inTabBar: true },
];
