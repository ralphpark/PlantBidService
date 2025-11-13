import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createAdmin(username: string, email: string, password: string, name: string, phone: string) {
  try {
    // Check if username exists
    const userExists = await db.select().from(users).where(eq(users.username, username));
    if (userExists.length > 0) {
      console.log(`User ${username} already exists.`);
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create admin user
    const [admin] = await db
      .insert(users)
      .values({
        username,
        email,
        password: hashedPassword,
        role: "admin",
        name,
        phone,
      })
      .returning();

    console.log(`Admin user created successfully: ${JSON.stringify(admin, null, 2)}`);
  } catch (error) {
    console.error("Error creating admin user:", error);
  }
}

// Usage example
// Don't change these values unless you're explicitly instructed to do so
const ADMIN_USERNAME = "admin";
const ADMIN_EMAIL = "admin@plantbid.com";
const ADMIN_PASSWORD = "adminPassword123!";
const ADMIN_NAME = "Admin User";
const ADMIN_PHONE = "010-0000-0000";

// Create admin user
createAdmin(ADMIN_USERNAME, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME, ADMIN_PHONE).finally(() => {
  console.log("Admin creation process completed.");
  process.exit(0);
});