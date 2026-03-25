/**
 * Seed CMS admin users into MongoDB
 *
 * Usage: npx tsx scripts/seed-users.ts
 *
 * Requires MONGODB_URI and MONGODB_DB_NAME env vars.
 * Set TINA_ALLOWED_EMAILS to the comma-separated list of admin emails.
 */

import { MongoClient } from 'mongodb';

async function seedUsers() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;
  const emails = process.env.TINA_ALLOWED_EMAILS?.split(',').map((e) =>
    e.trim()
  );

  if (!uri || !dbName) {
    console.error('Missing MONGODB_URI or MONGODB_DB_NAME');
    process.exit(1);
  }

  if (!emails?.length) {
    console.error('Missing TINA_ALLOWED_EMAILS');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db(dbName);
    const collection = db.collection('users');

    for (const email of emails) {
      const existing = await collection.findOne({ email });
      if (existing) {
        console.log(`User ${email} already exists, skipping.`);
      } else {
        await collection.insertOne({
          email,
          role: 'admin',
          createdAt: new Date(),
        });
        console.log(`Created user: ${email}`);
      }
    }

    console.log('Seed complete.');
  } finally {
    await client.close();
  }
}

seedUsers().catch(console.error);
