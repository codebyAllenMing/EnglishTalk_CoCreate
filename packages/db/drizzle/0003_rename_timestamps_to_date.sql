-- 時間欄位改成使用者慣例 xxxDate（2026-09-22）。純改名，資料不動；better-auth 那側用 fields 對映。
ALTER TABLE "Accounts" RENAME COLUMN "accessTokenExpiresAt" TO "accessTokenExpireDate";--> statement-breakpoint
ALTER TABLE "Accounts" RENAME COLUMN "refreshTokenExpiresAt" TO "refreshTokenExpireDate";--> statement-breakpoint
ALTER TABLE "Accounts" RENAME COLUMN "createdAt" TO "createDate";--> statement-breakpoint
ALTER TABLE "Accounts" RENAME COLUMN "updatedAt" TO "updateDate";--> statement-breakpoint
ALTER TABLE "Sessions" RENAME COLUMN "expiresAt" TO "expireDate";--> statement-breakpoint
ALTER TABLE "Sessions" RENAME COLUMN "createdAt" TO "createDate";--> statement-breakpoint
ALTER TABLE "Sessions" RENAME COLUMN "updatedAt" TO "updateDate";--> statement-breakpoint
ALTER TABLE "Users" RENAME COLUMN "createdAt" TO "createDate";--> statement-breakpoint
ALTER TABLE "Users" RENAME COLUMN "updatedAt" TO "updateDate";--> statement-breakpoint
ALTER TABLE "Users" RENAME COLUMN "lastSeenAt" TO "lastSeenDate";--> statement-breakpoint
ALTER TABLE "Verifications" RENAME COLUMN "expiresAt" TO "expireDate";--> statement-breakpoint
ALTER TABLE "Verifications" RENAME COLUMN "createdAt" TO "createDate";--> statement-breakpoint
ALTER TABLE "Verifications" RENAME COLUMN "updatedAt" TO "updateDate";
