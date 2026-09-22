import { apiUrl } from "@/api";
import type { CountryCode, GenderCode, LangCode, LevelCode } from "@/Components/Profile/profileData";

/** 跟 apps/api 的 routes/profile.ts 同形狀。avatar 是 Avatars 表的 code，對 public/images/avatar-<code>.webp */
export type Profile = {
	name: string;
	email: string;
	avatar: string;
	nativeLang: LangCode;
	nativeLevel: LevelCode;
	learningLang: LangCode;
	learningLevel: LevelCode;
	country: CountryCode;
	gender: GenderCode;
	interests: string[];
	bio: string;
};

/** PUT 的 body：Profile 去掉 email（改 email 是 auth 的事） */
export type ProfileInput = Omit<Profile, "email">;

/** 自己的個人資料；沒登入是 401 → throw，ProfileProvider 吞掉（SessionProvider 會導去 login） */
export async function getProfile(): Promise<Profile> {
	const response = await fetch(apiUrl("/api/me/profile"), { credentials: "include" });
	if (!response.ok) throw new Error(`profile responded ${response.status}`);
	return response.json();
}

export type SaveResult = { ok: true; profile: Profile } | { ok: false; field?: string };

/** 400 會帶第一個錯的欄位名（後端驗證），網路失敗沒有 field */
export async function updateProfile(input: ProfileInput): Promise<SaveResult> {
	let response: Response;
	try {
		response = await fetch(apiUrl("/api/me/profile"), {
			method: "PUT",
			headers: { "Content-Type": "application/json" },
			credentials: "include",
			body: JSON.stringify(input),
		});
	} catch {
		return { ok: false };
	}
	if (!response.ok) {
		const data: unknown = await response.json().catch(() => null);
		const field = typeof data === "object" && data !== null && "field" in data ? String(data.field) : undefined;
		return { ok: false, field };
	}
	return { ok: true, profile: await response.json() };
}

/** 別人的公開資料（GET /api/users），跟 apps/api 的 routes/users.ts 同形狀 */
export type PublicUser = {
	id: string;
	name: string;
	avatar: string;
	nativeLang: LangCode;
	learningLang: LangCode;
	learningLevel: LevelCode;
	bio: string;
	/** ISO 字串；從沒上線過是 null */
	lastSeenAt: string | null;
};

/** 除了自己以外的人，最多 50 筆；線上狀態另外從 /api/presence 拿 */
export async function getUsers(): Promise<PublicUser[]> {
	const response = await fetch(apiUrl("/api/users"), { credentials: "include" });
	if (!response.ok) throw new Error(`users responded ${response.status}`);
	return response.json();
}
