import { once } from 'node:events';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import fixtures from '../../client/e2e/fixtures/reservation.json';
import { app } from '../app';
import { getEnv } from '../config/env';
import Reservation from '../models/Reservation.model';
import Resource from '../models/Resource.model';
import User from '../models/User';

async function startE2eApi(): Promise<void> {
  const { PORT } = getEnv();
  const replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });

  try {
    await mongoose.connect(replicaSet.getUri());
    await Resource.create([
      { name: 'Library Study Room', type: 'ROOM', location: 'Library' },
      { name: 'Media Camera Kit', type: 'EQUIPMENT', location: 'Media Center' },
      {
        _id: fixtures.studyRoom.id,
        name: fixtures.studyRoom.name,
        type: 'ROOM',
        location: 'Library',
      },
      {
        _id: fixtures.printer.id,
        name: fixtures.printer.name,
        type: 'EQUIPMENT',
        location: 'Makerspace',
      },
    ]);
    await User.create([
      { _id: fixtures.students.roomRequester, name: 'Room Requester', email: 'room@example.test' },
      { _id: fixtures.students.printerOwner, name: 'Printer Owner', email: 'owner@example.test' },
      {
        _id: fixtures.students.printerRequester,
        name: 'Printer Requester',
        email: 'printer@example.test',
      },
    ]);
    await Reservation.init();

    const server = app.listen(PORT, '127.0.0.1');
    await once(server, 'listening');
    await once(process, 'SIGTERM');
    await server[Symbol.asyncDispose]();
  } finally {
    try {
      await mongoose.disconnect();
    } finally {
      await replicaSet.stop();
    }
  }
}

void startE2eApi().catch((error: unknown): void => {
  console.error('[campushub-e2e] API startup or shutdown failed.', error);
  process.exitCode = 1;
});
