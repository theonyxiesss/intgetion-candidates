import { char, jsonb, pgTable, text, uuid } from "drizzle-orm/pg-core";

/** Read-only views of tables other modules own (taxonomy, users). Never written here. */
export const skills = pgTable("skills", {
  id: uuid("id").primaryKey(),
  slug: text("slug").notNull(),
  nameEn: text("name_en").notNull(),
  nameRu: text("name_ru").notNull(),
});

export type SharedLanguage = { code: string; level: string | null };

export const userProfiles = pgTable("user_profiles", {
  userId: uuid("user_id").primaryKey(),
  displayName: text("display_name"),
  country: char("country", { length: 2 }),
  city: text("city"),
  timezone: text("timezone"),
  languages: jsonb("languages").$type<SharedLanguage[]>().notNull(),
  about: text("about"),
});
