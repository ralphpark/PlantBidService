import { Pool, neonConfig } from '@neondatabase/serverless';
import * as fs from 'fs';
import * as path from 'path';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function executeSql(sql: string) {
  try {
    await pool.query(sql);
    console.log(`SQL executed successfully: ${sql.substring(0, 50)}...`);
  } catch (error) {
    console.error(`Error executing SQL: ${sql.substring(0, 50)}...`);
    console.error(error);
  }
}

async function updatePlantsSchema() {
  try {
    console.log("Starting schema update...");
    
    // Step 1: Drop the plants table (will cause data loss)
    await executeSql(`
      DROP TABLE IF EXISTS "plants" CASCADE;
    `);
    
    // Step 2: Create the new plants table with all the fields
    await executeSql(`
      CREATE TABLE "plants" (
        "id" SERIAL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "image_url" TEXT,
        "scientific_name" TEXT,
        "description" TEXT,
        "water_needs" TEXT,
        "light" TEXT,
        "humidity" TEXT,
        "temperature" TEXT,
        "winter_temperature" TEXT,
        "color_feature" TEXT,
        "plant_type" TEXT,
        "has_thorns" BOOLEAN,
        "leaf_shape1" TEXT,
        "leaf_shape2" TEXT,
        "leaf_shape3" TEXT,
        "leaf_shape4" TEXT,
        "experience_level" TEXT,
        "pet_safety" TEXT,
        "size" TEXT,
        "difficulty" TEXT,
        "price_range" TEXT,
        "care_instructions" TEXT,
        "category" TEXT,
        "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);
    
    // Step 3: Update foreign key constraints if necessary
    await executeSql(`
      ALTER TABLE "bids" 
      ADD CONSTRAINT "bids_plant_id_fkey" 
      FOREIGN KEY ("plant_id") 
      REFERENCES "plants" ("id");
    `);
    
    console.log("Schema update completed successfully.");
  } catch (error) {
    console.error("Error updating schema:", error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

updatePlantsSchema();