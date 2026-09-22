import type { TLAssetStore } from "tldraw";

/**
 * 圖片 / 檔案上傳先關掉：要接儲存空間（R2 之類）才能開，發表前不做。
 * 貼圖片進畫布會拿到這個錯誤，tldraw 自己會吞掉、不放進畫布。
 */
export const noUploads: TLAssetStore = {
	upload: async () => {
		throw new Error("whiteboard uploads are disabled");
	},
};
