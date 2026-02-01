// Nova connector doesn't need its own tables — conversations are stored in Nova AI's database.
// This file exists for consistency with the module structure.

// If you need to store local conversation metadata, add tables here:
// import { pgTable, serial, text, timestamp, integer } from "drizzle-orm/pg-core";
// import { users } from "./common";
//
// export const novaConversations = pgTable("nova_conversations", {
//   id: serial("id").primaryKey(),
//   userId: integer("user_id").references(() => users.id),
//   novaConversationId: text("nova_conversation_id"),
//   title: text("title"),
//   createdAt: timestamp("created_at").defaultNow(),
// });
