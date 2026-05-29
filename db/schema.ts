import { 
  mysqlTable, 
  int, 
  varchar, 
  text, 
  timestamp, 
  boolean, 
  mysqlEnum 

} from "drizzle-orm/mysql-core";

export const newUsers = mysqlTable("new_users", {
  id: int("id").autoincrement().primaryKey(),
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  studyStatus: mysqlEnum("studyStatus", [
    "student",
    "graduated",
    "master_student",
    "phd_student",
    "other",
  ]).notNull(),
  attestationUrl: text("attestationUrl"),
  phoneNumber: varchar("phoneNumber", { length: 50 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  isAmbassador: boolean("isAmbassador").default(false).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  emailConfirmed: boolean("emailConfirmed").default(false).notNull(),
  confirmationToken: varchar("confirmationToken", { length: 255 }),
  passwordResetToken: varchar("passwordResetToken", { length: 64 }),
  passwordResetExpiresAt: timestamp("passwordResetExpiresAt"),
  newsletterConsent: boolean("newsletterConsent").default(false).notNull(),
  questionnaireDraft: text("questionnaireDraft"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastLoginAt: timestamp("lastLoginAt"),
});

export type NewUser = typeof newUsers.$inferSelect;
export type InsertNewUser = typeof newUsers.$inferInsert;

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  unionId: varchar("unionId", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }),
  avatar: text("avatar"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  status: mysqlEnum("status", ["candidate", "ambassador", "user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
  date: timestamp("date").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const candidates = mysqlTable("candidates", {
  id: int("id").autoincrement().primaryKey(),
  newUserId: int("newUserId").notNull().unique(),
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  studyStatus: mysqlEnum("studyStatus", [
    "student",
    "graduated",
    "master_student",
    "phd_student",
    "other",
  ]).notNull(),
  attestationUrl: text("attestationUrl"),
  idCardUrl: text("idCardUrl"),
  phoneNumber: varchar("phoneNumber", { length: 50 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  isAmbassador: boolean("isAmbassador").default(false).notNull(),
  password: varchar("password", { length: 255 }).notNull(),
  emailConfirmed: boolean("emailConfirmed").default(false).notNull(),
  confirmationToken: varchar("confirmationToken", { length: 255 }),
  passwordResetToken: varchar("passwordResetToken", { length: 64 }),
  passwordResetExpiresAt: timestamp("passwordResetExpiresAt"),
  newsletterConsent: boolean("newsletterConsent").default(false).notNull(),
  applicationStatus: mysqlEnum("applicationStatus", [
    "pending",
    "accepted",
    "rejected",
  ])
    .default("pending")
    .notNull(),
  questionnaireAnswers: text("questionnaireAnswers"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type Candidate = typeof candidates.$inferSelect;
export type InsertCandidate = typeof candidates.$inferInsert;

export const editions = mysqlTable("editions", {
  id: int("id").autoincrement().primaryKey(),
  editionNumber: int("editionNumber").notNull().unique(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  dateRange: varchar("dateRange", { length: 255 }),
  eventDate: varchar("eventDate", { length: 255 }),
  eventTime: varchar("eventTime", { length: 255 }),
  location: varchar("location", { length: 255 }),
  speakers: text("speakers"),
  guests: text("guests"),
  conferences: text("conferences"),
  activities: text("activities"),
  videoUrl: text("videoUrl"),
  coverImage: text("coverImage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Edition = typeof editions.$inferSelect;
export type InsertEdition = typeof editions.$inferInsert;

export const editionImages = mysqlTable("edition_images", {
  id: int("id").autoincrement().primaryKey(),
  editionId: int("editionId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  caption: varchar("caption", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EditionImage = typeof editionImages.$inferSelect;
export type InsertEditionImage = typeof editionImages.$inferInsert;

export const contactMessages = mysqlTable("contact_messages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  subject: varchar("subject", { length: 255 }).notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ContactMessage = typeof contactMessages.$inferSelect;
export type InsertContactMessage = typeof contactMessages.$inferInsert;

export const newsletterSubscribers = mysqlTable("newsletter_subscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  isSubscribed: boolean("isSubscribed").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;
export const ambassadorMessages = mysqlTable("ambassador_messages", {
  id: int("id").autoincrement().primaryKey(),
  authorName: varchar("authorName", { length: 255 }).notNull(),
  authorType: mysqlEnum("authorType", ["ambassador", "admin"]).notNull(),
  authorCandidateId: int("authorCandidateId"),
  authorAdminId: int("authorAdminId"),
  message: text("message").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AmbassadorMessage = typeof ambassadorMessages.$inferSelect;
export type InsertAmbassadorMessage = typeof ambassadorMessages.$inferInsert;
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  passwordResetToken: varchar("passwordResetToken", { length: 64 }),
  passwordResetExpiresAt: timestamp("passwordResetExpiresAt"),
  role: mysqlEnum("role", ["admin", "super_admin"]).default("admin").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt")
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;
