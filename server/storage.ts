import { users, tokens, auditLogs } from "@shared/schema";
import { type User, type InsertUser, type Token, type AuditLog } from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createToken(token: Omit<Token, "id">): Promise<Token>;
  getToken(token: string): Promise<Token | undefined>;
  createAuditLog(log: Omit<AuditLog, "id">): Promise<AuditLog>;
  getAuditLogs(userId: number): Promise<AuditLog[]>;
  sessionStore: session.Store;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async createToken(token: Omit<Token, "id">): Promise<Token> {
    const [newToken] = await db.insert(tokens).values(token).returning();
    return newToken;
  }

  async getToken(tokenStr: string): Promise<Token | undefined> {
    const [token] = await db.select().from(tokens).where(eq(tokens.token, tokenStr));
    return token;
  }

  async createAuditLog(log: Omit<AuditLog, "id">): Promise<AuditLog> {
    const [auditLog] = await db.insert(auditLogs).values(log).returning();
    return auditLog;
  }

  async getAuditLogs(userId: number): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.userId, userId))
      .orderBy(desc(auditLogs.timestamp));
  }
}

export const storage = new DatabaseStorage();