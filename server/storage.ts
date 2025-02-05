import { User, InsertUser, Token, AuditLog } from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  createToken(token: Omit<Token, "id">): Promise<Token>;
  getToken(token: string): Promise<Token | undefined>;
  createAuditLog(log: Omit<AuditLog, "id">): Promise<AuditLog>;
  sessionStore: session.Store;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private tokens: Map<number, Token>;
  private auditLogs: Map<number, AuditLog>;
  sessionStore: session.Store;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.tokens = new Map();
    this.auditLogs = new Map();
    this.currentId = 1;
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user = { ...insertUser, id, role: "user" };
    this.users.set(id, user);
    return user;
  }

  async createToken(token: Omit<Token, "id">): Promise<Token> {
    const id = this.currentId++;
    const newToken = { ...token, id };
    this.tokens.set(id, newToken);
    return newToken;
  }

  async getToken(tokenStr: string): Promise<Token | undefined> {
    return Array.from(this.tokens.values()).find(
      (token) => token.token === tokenStr,
    );
  }

  async createAuditLog(log: Omit<AuditLog, "id">): Promise<AuditLog> {
    const id = this.currentId++;
    const auditLog = { ...log, id };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }
}

export const storage = new MemStorage();
