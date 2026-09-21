import type { ReactNode } from "react";
import SessionProvider from "@/auth/SessionProvider";
import { getLocale } from "@/dictionaries";

/**
 * 登入後的區域：home / settings / room 都在這個 route group 底下，網址不變。
 *
 * 這一層只做一件事 —— 掛 SessionProvider，在 client 查 session、沒登入導去 login。
 * 頁面的殼（側邊欄、頂部列）**不在這裡**，理由見 AppShell.tsx：側邊欄每頁不同，
 * layout 拿不到子頁的 props。
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
	const locale = await getLocale();
	return <SessionProvider locale={locale}>{children}</SessionProvider>;
}
