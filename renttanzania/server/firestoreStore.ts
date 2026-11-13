import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Firestore is the only database. The server is its only reader and writer (the
// Admin SDK bypasses security rules; the rules deny all browser access).
//
// Collections are prefixed so they never mix with documents that older versions
// of the browser app wrote directly into `users`, `listings` and `bookings`.
const PREFIX = 'rentz_';
const META_DOC = `${PREFIX}meta/schema`;
const MAX_BATCH_OPS = 450; // Firestore allows 500 writes per batch

let firestore: Firestore | null = null;

export function getStore(): Firestore {
  if (!firestore) {
    // Credentials come from the environment: the Cloud Run service account in
    // production, GOOGLE_APPLICATION_CREDENTIALS or `gcloud auth application-default
    // login` locally, or none at all when FIRESTORE_EMULATOR_HOST is set.
    const app = getApps()[0] || initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || firebaseConfig.projectId });
    firestore = getFirestore(app, process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId);
    firestore.settings({ ignoreUndefinedProperties: true });
  }
  return firestore;
}

export function describeStore(): string {
  const databaseId = process.env.FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
  const target = process.env.FIRESTORE_EMULATOR_HOST ? `emulator ${process.env.FIRESTORE_EMULATOR_HOST}` : 'Google Cloud';
  return `Firestore (${target}, database "${databaseId}")`;
}

// Returns every collection's documents, or null when this database has never been initialised
export async function loadCollections(names: string[]): Promise<Record<string, unknown[]> | null> {
  const store = getStore();
  const meta = await store.doc(META_DOC).get();
  if (!meta.exists) return null;
  const snapshots = await Promise.all(names.map((name) => store.collection(PREFIX + name).get()));
  const result: Record<string, unknown[]> = {};
  names.forEach((name, i) => {
    result[name] = snapshots[i].docs.map((d) => d.data());
  });
  return result;
}

export interface CollectionChanges {
  name: string;
  upserts: [string, unknown][];
  deletes: string[];
}

export async function writeChanges(changes: CollectionChanges[], markInitialised: boolean): Promise<void> {
  const store = getStore();
  const ops: ((batch: FirebaseFirestore.WriteBatch) => void)[] = [];
  for (const { name, upserts, deletes } of changes) {
    const col = store.collection(PREFIX + name);
    for (const [id, doc] of upserts) ops.push((b) => b.set(col.doc(id), doc as FirebaseFirestore.DocumentData));
    for (const id of deletes) ops.push((b) => b.delete(col.doc(id)));
  }
  if (markInitialised) {
    ops.push((b) => b.set(store.doc(META_DOC), { initialisedAt: new Date().toISOString(), version: 1 }));
  }
  for (let i = 0; i < ops.length; i += MAX_BATCH_OPS) {
    const batch = store.batch();
    ops.slice(i, i + MAX_BATCH_OPS).forEach((op) => op(batch));
    await batch.commit();
  }
}
