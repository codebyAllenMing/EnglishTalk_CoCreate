/**
 * AuthField（server）與 PasswordField（client）共用的欄位樣式。
 *
 * 抽出來的理由不是「少打字」，而是這兩個元件會在同一張表單裡上下相鄰 ——
 * 圓角、邊框、focus ring 差一點點都會看得出來，而它們因為 client 邊界
 * 沒辦法共用同一個元件，只能共用同一份字串。
 *
 * pr 不放進 FIELD_INPUT：一般欄位是 pr-3.5，密碼欄位要留出眼睛按鈕的位置。
 */
export const FIELD_LABEL = "mb-1.5 block text-xs font-extrabold text-ink-600";

export const FIELD_INPUT =
	"peer w-full rounded-xl border-2 border-ink-200 bg-surface py-2.5 pl-10 placeholder:text-ink-300 focus:border-primary-500 focus:ring-4 focus:ring-primary-100 focus:outline-none";

export const FIELD_ICON =
	"pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-ink-300 transition-colors peer-focus:text-primary-500";

export const FIELD_HINT = "mt-1.5 text-xs text-ink-400";
