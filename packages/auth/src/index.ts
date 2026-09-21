export { createAuth, verifySession } from "./auth.ts";
export type { Auth, AuthOptions, Session, SessionData, User } from "./auth.ts";
export { requireUser } from "./middleware.ts";
export type { AuthEnv } from "./middleware.ts";
/** better-auth 的錯誤型別守門，給 server-side 呼叫 auth.api.* 的地方判斷錯誤碼；api 不直接相依 better-auth */
export { isAPIError } from "better-auth/api";
