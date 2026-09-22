"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getProfile, type Profile } from "./client";

type ProfileContextValue = {
	/** null = 還沒載到（第一次 render 一定是 null，靜態 HTML 沒有資料） */
	profile: Profile | null;
	/** 設定頁存完直接塞新值，不用再打一次 GET */
	setProfile: (profile: Profile) => void;
};

const ProfileContext = createContext<ProfileContextValue>({ profile: null, setProfile: () => undefined });

export function useProfile(): ProfileContextValue {
	return useContext(ProfileContext);
}

/**
 * 登入者自己的個人資料，掛在 (app)/layout.tsx、SessionProvider 之內。
 * 個人資料卡、頂部列頭像、設定頁都從這裡拿，整個登入後區域只打一次 GET。
 *
 * 靜態匯出的 HTML 沒有任何個人資料，一定是 hydration 之後才載入 —— 用到的元件要有
 * profile 為 null 時的樣子（骨架），不能假設它一開始就有。
 * 401（沒登入）與網路錯誤都吞掉：前者 SessionProvider 會導去 login，後者畫面停在骨架。
 */
export default function ProfileProvider({ children }: { children: ReactNode }) {
	const [profile, setProfile] = useState<Profile | null>(null);

	useEffect(() => {
		let cancelled = false;
		getProfile().then(
			(loaded) => {
				if (!cancelled) setProfile(loaded);
			},
			() => undefined,
		);
		return () => {
			cancelled = true;
		};
	}, []);

	return <ProfileContext value={{ profile, setProfile }}>{children}</ProfileContext>;
}
