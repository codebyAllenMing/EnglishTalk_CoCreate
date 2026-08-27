import { Home, MessageCircle, Settings, ShieldCheck, Users, type LucideIcon } from "lucide-react";
import type { Dictionary } from "@/dictionaries";

type NavItem = {
	key: keyof Dictionary["profile"]["nav"];
	icon: LucideIcon;
};

/**
 * 側邊欄與底部 tab bar 共用同一份定義 —— 兩者是同一組導覽的兩種呈現，
 * 分開維護遲早會漂移（少一項、順序不同、icon 不一致）。
 *
 * ⚠️ 全部是純視覺，不給連結 —— 對應的頁面都還不存在，
 *    照專案既有決策「不存在的頁面不給連結、不做任何轉導」。
 *    只有第一項是當前頁。
 *
 * ⚠️ **My Schedule 與 Find Monsters 不在這裡**（使用者 2026-08-27 決定）：
 *    那兩區就常駐在個人首頁上，導覽再列一次是指向自己。
 *    也因為只剩五項，tab bar 塞得下全部 —— 原本用來挑五項的 inTabBar 旗標
 *    連同它的理由一起拿掉了。
 */
export const NAV_ITEMS: readonly NavItem[] = [
	{ key: "home", icon: Home },
	{ key: "rooms", icon: Users },
	{ key: "messages", icon: MessageCircle },
	{ key: "reputation", icon: ShieldCheck },
	{ key: "settings", icon: Settings },
];
