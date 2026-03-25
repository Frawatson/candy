const fs = require('fs');
const path = require('path');
const db = require('./connection');

async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    
    const migrationsDir = path.join(__dirname, 'migrations');
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of migrationFiles) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      await db.query(sql);
      console.log(`✓ Migration ${file} completed`);
    }

    console.log('All migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

async function runSeeds() {
  try {
    console.log('Starting database seeding...');
    
    const seedsDir = path.join(__dirname, 'seeds');
    const seedFiles = fs.readdirSync(seedsDir)
      .filter(file => file.endsWith('.sql'))
      .sort();

    for (const file of seedFiles) {
      console.log(`Running seed: ${file}`);
      const sql = fs.readFileSync(path.join(seedsDir, file), 'utf8');
      await db.query(sql);
      console.log(`✓ Seed ${file} completed`);
    }

    console.log('All seeds completed successfully');
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

// Run migrations and seeds if called directly
if (require.main === module) {
  (async () => {
    await runMigrations();
    await runSeeds();
    process.exit(0);
  })();
}

module.exports = { runMigrations, runSeeds };