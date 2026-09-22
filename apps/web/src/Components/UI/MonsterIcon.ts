import { createLucideIcon, type IconNode } from "lucide-react";

/**
 * 自家的怪獸圖示：圓身、兩隻角、笑臉，照 lucide 的 24 格與 2px 線寬畫，
 * 用 createLucideIcon 做出來，所以 size / strokeWidth / className 跟其他 lucide 圖示完全一樣，
 * 也能直接塞進 navItems 的 `icon: LucideIcon`。
 *
 * 取代原本的 Ghost（使用者 2026-09-22 選的）：幽靈不像怪獸，跟頭像那群圓滾滾的角色沒有關係。
 */
const node: IconNode = [
	["path", { d: "M5 13a7 7 0 0 1 14 0v5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z", key: "body" }],
	["path", { d: "M7.5 6.5 6 3", key: "horn-left" }],
	["path", { d: "m16.5 6.5 1.5-3.5", key: "horn-right" }],
	["path", { d: "M9.5 12h.01", key: "eye-left" }],
	["path", { d: "M14.5 12h.01", key: "eye-right" }],
	["path", { d: "M9.5 15.5a3 3 0 0 0 5 0", key: "smile" }],
];

export const Monster = createLucideIcon("monster", node);
