CREATE TABLE "Avatars" (
	"id" smallint PRIMARY KEY NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "Avatars_code_unique" UNIQUE("code")
);
--> statement-breakpoint
-- 頭像目錄的內容跟 schema 一起進 migration（prod 也要有，不能靠 dev 的 seed）。
-- 順序 = packages/db/src/schema/profile.ts 的 AVATAR_CATALOG，id 從 1 起算；Users.avatarId 的 default 1 靠這裡的第一列。
INSERT INTO "Avatars" ("id", "code", "name") VALUES
	(1, 'allen', 'Allen'),
	(2, 'luna', 'Luna'),
	(3, 'bobby', 'Bobby'),
	(4, 'alex', 'Alex'),
	(5, 'mia', 'Mia'),
	(6, 'sunny', 'Sunny'),
	(7, 'tao', 'Tao'),
	(8, 'yuki', 'Yuki'),
	(9, 'ryan', 'Ryan'),
	(10, 'nina', 'Nina'),
	(11, 'leo', 'Leo');
--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "avatarId" smallint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "nativeLang" text DEFAULT 'zh' NOT NULL;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "nativeLevel" text DEFAULT 'fluent' NOT NULL;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "learningLang" text DEFAULT 'en' NOT NULL;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "learningLevel" text DEFAULT 'beginner' NOT NULL;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "country" text DEFAULT 'TW' NOT NULL;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "gender" text DEFAULT 'preferNot' NOT NULL;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "interests" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "Users" ADD COLUMN "bio" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "Users" ADD CONSTRAINT "Users_avatarId_Avatars_id_fk" FOREIGN KEY ("avatarId") REFERENCES "public"."Avatars"("id") ON DELETE no action ON UPDATE no action;