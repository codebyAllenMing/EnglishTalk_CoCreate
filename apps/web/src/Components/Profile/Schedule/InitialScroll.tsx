"use client";

import { useLayoutEffect } from "react";

type Props = {
	/** 要捲的容器 id（不用 ref：容器在 ScheduleGrid 裡，這個元件只是掛在旁邊） */
	targetId: string;
	top: number;
};

/**
 * 進頁時把週曆捲到指定位置，本身不 render 任何東西。
 *
 * 之前是一段內嵌 <script>，跟著 HTML 一起到、解析到就執行，整頁載入時零閃爍。
 * 但 client 端導頁（登入後的 router.push、側邊欄的 Link）是 React 用 DOM API 建節點，
 * 這樣建出來的 <script> 瀏覽器規格上就是不執行，React 也會警告。所以改成 effect。
 *
 * 用 useLayoutEffect 不用 useEffect：它在 DOM 提交後、瀏覽器繪製前跑，client 端導頁不會
 * 先畫一次凌晨再跳走。整頁載入時仍會在 JS 載入完成前短暫看到凌晨 —— 靜態 HTML 先畫、
 * hydration 才有 effect，這是 React 的天性，不是這裡能救的。
 *
 * ⚠️ 不能只設一次就走。Next.js 的 dev 模式用 JS 注入 CSS，effect 跑的那一刻 max-h
 *    可能還沒套用，容器的 scrollHeight 等於 clientHeight，scrollTop 會被瀏覽器 clamp 成 0。
 *    production 的 CSS 是 head 裡的 blocking <link>，第一次就會成功。
 *    所以先試一次，不成就用 ResizeObserver 等容器真的變得可捲動再設，設完立刻斷開。
 */
export default function InitialScroll({ targetId, top }: Props) {
	useLayoutEffect(() => {
		const el = document.getElementById(targetId);
		if (!el) return;

		const apply = () => {
			if (el.scrollHeight <= el.clientHeight) return false;
			el.scrollTop = top;
			return true;
		};
		if (apply()) return;

		const observer = new ResizeObserver(() => {
			if (apply()) observer.disconnect();
		});
		observer.observe(el);
		return () => observer.disconnect();
	}, [targetId, top]);

	return null;
}
