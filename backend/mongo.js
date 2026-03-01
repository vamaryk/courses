import { MongoClient } from 'mongodb';

const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017';
const mongoDbName = process.env.MONGO_DB_NAME || 'Lms-proj';

let mongoClientPromise = null;

async function getMongoClient() {
  if (!mongoClientPromise) {
    const client = new MongoClient(mongoUri);
    mongoClientPromise = client.connect();
  }
  return mongoClientPromise;
}

export async function getMongoDb() {
  const client = await getMongoClient();
  return client.db(mongoDbName);
}

export async function getMongoCollections() {
  const db = await getMongoDb();
  return {
    chats: db.collection('chats'),
    groupchats: db.collection('groupchats'),
  };
}

export function getMongoConfig() {
  return { mongoUri, mongoDbName };
}
