CREATE TABLE "Words" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "Words_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" text NOT NULL,
	"roomId" integer,
	"word" text NOT NULL,
	"pos" smallint NOT NULL,
	"meaning" text DEFAULT '' NOT NULL,
	"example" text DEFAULT '' NOT NULL,
	"lang" text NOT NULL,
	"isDelete" boolean DEFAULT false NOT NULL,
	"createDate" timestamp with time zone DEFAULT now() NOT NULL,
	"updateDate" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Words_pos_check" CHECK ("Words"."pos" between 1 and 7),
	CONSTRAINT "Words_lang_check" CHECK ("Words"."lang" in ('zh', 'en'))
);
--> statement-breakpoint
ALTER TABLE "Words" ADD CONSTRAINT "Words_userId_Users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Words" ADD CONSTRAINT "Words_roomId_Rooms_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."Rooms"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Words_userId_createDate_idx" ON "Words" USING btree ("userId","createDate");--> statement-breakpoint
CREATE INDEX "Words_roomId_idx" ON "Words" USING btree ("roomId");--> statement-breakpoint
CREATE UNIQUE INDEX "Words_userId_lang_word_unique" ON "Words" USING btree ("userId","lang",lower("word")) WHERE "Words"."isDelete" = false;