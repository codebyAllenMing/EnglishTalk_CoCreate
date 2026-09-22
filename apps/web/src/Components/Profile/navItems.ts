import {
	BookOpen,
	CalendarDays,
	History,
	Home,
	Settings,
	Users,
	type LucideIcon,
} from "lucide-react";
import { Monster } from "@/Components/UI/MonsterIcon";
import type { Dictionary } from "@/dictionaries";

export type NavKey = keyof Dictionary["profile"]["nav"];

type NavItem = {
	key: NavKey;
	icon: LucideIcon;
	/**
	 * 不含語系前綴的路徑；沒有的項目是純視覺（頁面還不存在）。
	 * My Schedule / Find Monsters 指向個人首頁的區塊錨點 —— 它們不是獨立頁面，
	 * 但從設定頁看過去時它們不在畫面上，連回去才有意義。
	 */
	href?: string;
	/** 手機版底部 tab bar 只放得下 5 項 */
	inTabBar: boolean;
};

/**
 * 側邊欄與底部 tab bar 共用同一份定義 —— 兩者是同一組導覽的兩種呈現，
 * 分開維護遲早會漂移（少一項、順序不同、icon 不一致）。
 *
 * 七項照 `Profile Setting.jpg`（使用者 2026-09-21 拍板）：History 與 Word Bank 是
 * 新的、Messages 與 Reputation 拿掉。上一版曾因「已經在畫面常駐」把 My Schedule /
 * Find Monsters 移除，那個理由只在 /home 成立，多了第二頁之後它們就回來了。
 *
 * ⚠️ 沒有 href 的項目不給連結 —— 對應的頁面都還不存在，
 *    照專案既有決策「不存在的頁面不給連結、不做任何轉導」。
 *
 * Find Monsters 用自家的 Monster 圖示（UI/MonsterIcon.ts，lucide 風格線條），
 * 跟區塊標題、面板提示同一顆；原本的 Ghost 像幽靈不像怪獸（使用者 2026-09-22 換的）。
 */
export const NAV_ITEMS: readonly NavItem[] = [
	{ key: "home", icon: Home, href: "/home", inTabBar: true },
	{ key: "schedule", icon: CalendarDays, href: "/home#schedule", inTabBar: true },
	{ key: "monsters", icon: Monster, href: "/home#monsters", inTabBar: true },
	{ key: "rooms", icon: Users, inTabBar: true },
	{ key: "history", icon: History, inTabBar: false },
	{ key: "wordBank", icon: BookOpen, inTabBar: false },
	{ key: "settings", icon: Settings, href: "/settings", inTabBar: true },
];
