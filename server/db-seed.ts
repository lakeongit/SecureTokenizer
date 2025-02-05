
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "./db";
import { users } from "@shared/schema";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function seed() {
  const hashedPassword = await hashPassword("admin123");
  
  await db.insert(users).values({
    username: "admin",
    password: hashedPassword,
    role: "admin"
  }).onConflictDoNothing();
  
  console.log("Admin account created");
  process.exit(0);
}

seed().catch(console.error);
