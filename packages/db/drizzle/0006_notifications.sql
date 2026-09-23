CREATE TABLE "Notifications" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "Notifications_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" text NOT NULL,
	"type" smallint NOT NULL,
	"text" text NOT NULL,
	"isRead" boolean DEFAULT false NOT NULL,
	"createDate" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Notifications_type_check" CHECK ("Notifications"."type" between 1 and 10)
);
--> statement-breakpoint
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_userId_Users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "Notifications_userId_createDate_idx" ON "Notifications" USING btree ("userId","createDate");--> statement-breakpoint
CREATE INDEX "Notifications_userId_unread_idx" ON "Notifications" USING btree ("userId") WHERE "Notifications"."isRead" = false;