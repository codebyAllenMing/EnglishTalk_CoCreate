CREATE TABLE "RoomMembers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "RoomMembers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"roomId" integer NOT NULL,
	"userId" text NOT NULL,
	"role" text NOT NULL,
	"status" text NOT NULL,
	"createDate" timestamp with time zone DEFAULT now() NOT NULL,
	"updateDate" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "RoomMembers_roomId_userId_unique" UNIQUE("roomId","userId")
);
--> statement-breakpoint
CREATE TABLE "Rooms" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "Rooms_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"code" text NOT NULL,
	"hostId" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"startDate" timestamp with time zone NOT NULL,
	"endDate" timestamp with time zone NOT NULL,
	"durationMinutes" smallint NOT NULL,
	"capacity" smallint NOT NULL,
	"roomType" smallint NOT NULL,
	"cancelDate" timestamp with time zone,
	"createDate" timestamp with time zone DEFAULT now() NOT NULL,
	"updateDate" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "Rooms_code_unique" UNIQUE("code"),
	CONSTRAINT "Rooms_durationMinutes_check" CHECK ("Rooms"."durationMinutes" in (20, 40, 60)),
	CONSTRAINT "Rooms_capacity_check" CHECK ("Rooms"."capacity" between 2 and 4)
);
--> statement-breakpoint
ALTER TABLE "RoomMembers" ADD CONSTRAINT "RoomMembers_roomId_Rooms_id_fk" FOREIGN KEY ("roomId") REFERENCES "public"."Rooms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "RoomMembers" ADD CONSTRAINT "RoomMembers_userId_Users_id_fk" FOREIGN KEY ("userId") REFERENCES "public"."Users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "Rooms" ADD CONSTRAINT "Rooms_hostId_Users_id_fk" FOREIGN KEY ("hostId") REFERENCES "public"."Users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "RoomMembers_userId_idx" ON "RoomMembers" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "Rooms_hostId_idx" ON "Rooms" USING btree ("hostId");--> statement-breakpoint
CREATE INDEX "Rooms_startDate_idx" ON "Rooms" USING btree ("startDate");