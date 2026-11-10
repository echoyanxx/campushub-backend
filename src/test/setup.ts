import { randomUUID } from 'node:crypto';
import * as os from 'node:os';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import Reservation from '../models/Reservation.model';
import Resource from '../models/Resource.model';
import User from '../models/User';

let replicaSet: MongoMemoryReplSet | undefined;
let connected = false;

beforeAll(async (): Promise<void> => {
  let uri = process.env.MONGODB_TEST_URI;
  if (!uri) {
    replicaSet = await MongoMemoryReplSet.create({
      replSet: { count: 1, storageEngine: 'wiredTiger' },
    });
    uri = replicaSet.getUri();
    process.env.MONGODB_TEST_URI = uri;
  }

  // Always use an isolated database, even when an external replica set is supplied.
  await mongoose.connect(uri, {
    dbName: `campushub_test_${randomUUID().replace(/-/g, '')}`,
    serverSelectionTimeoutMS: 10_000,
    // Avoid the driver's dynamic OS import inside Jest (MongoDB NODE-7832).
    runtimeAdapters: { os },
  });
  connected = true;
  await Promise.all([Resource.init(), User.init(), Reservation.init()]);
});

beforeEach(async (): Promise<void> => {
  // Delete documents while preserving the indexes initialized above.
  await Promise.all([Resource.deleteMany({}), User.deleteMany({}), Reservation.deleteMany({})]);
});

afterAll(async (): Promise<void> => {
  try {
    if (connected) {
      await mongoose.connection.dropDatabase();
    }
  } finally {
    try {
      await mongoose.disconnect();
    } finally {
      await replicaSet?.stop();
    }
  }
});
