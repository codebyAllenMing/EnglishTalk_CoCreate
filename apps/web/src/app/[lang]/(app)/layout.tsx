import type { ReactNode } from "react";
import SessionProvider from "@/auth/SessionProvider";
import ToastProvider from "@/Components/UI/ToastProvider";
import { getLocale } from "@/dictionaries";
import PresenceProvider from "@/presence/PresenceProvider";
import ProfileProvider from "@/profile/ProfileProvider";

/**
 * 登入後的區域：home / settings / room 都在這個 route group 底下，網址不變。
 *
 * 這一層只掛 provider —— SessionProvider 在 client 查 session、沒登入導去 login；
 * ProfileProvider 載入自己的個人資料給卡片 / 頂部列 / 設定頁共用；PresenceProvider 打自己的線上心跳；
 * ToastProvider 是跨頁的 snackbar。
 * 頁面的殼（側邊欄、頂部列）**不在這裡**，理由見 AppShell.tsx：側邊欄每頁不同，
 * layout 拿不到子頁的 props。
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
	const locale = await getLocale();
	return (
		<SessionProvider locale={locale}>
			<ProfileProvider>
				<PresenceProvider>
					<ToastProvider>{children}</ToastProvider>
				</PresenceProvider>
			</ProfileProvider>
		</SessionProvider>
	);
}
