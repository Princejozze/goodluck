// Set or remove the password of an existing account, run on the server machine:
//   npx tsx scripts/set-password.ts <email | phone | userId> <new-password>
//   npx tsx scripts/set-password.ts <email | phone | userId> --remove
// Uses the same Firestore as the server (same environment variables / credentials).
// Stop the server first: it keeps the database in memory and would overwrite this change.
import { db } from '../server/db.ts';
import { hashPassword, MIN_PASSWORD_LENGTH, normalizeEmail, normalizePhone } from '../server/auth.ts';

const [identifier, password] = process.argv.slice(2);
if (!identifier || !password) {
  console.error('Usage: npx tsx scripts/set-password.ts <email | phone | userId> <new-password | --remove>');
  process.exit(1);
}

const port = process.env.PORT || '3000';
const serverRunning = await fetch(`http://localhost:${port}/health`).then(() => true, () => false);
if (serverRunning) {
  console.error(`The RENTZ server is running on port ${port}. Stop it first, then run this again.`);
  process.exit(1);
}

await db.init();
const matches = db.getUsers().filter(
  (u) =>
    u.id === identifier ||
    (identifier.includes('@') && normalizeEmail(u.email) === normalizeEmail(identifier)) ||
    (!identifier.includes('@') && normalizePhone(identifier).length >= 9 && normalizePhone(u.phone) === normalizePhone(identifier))
);
if (matches.length !== 1) {
  console.error(
    matches.length === 0
      ? `No account found for "${identifier}".`
      : `"${identifier}" matches ${matches.length} accounts (${matches.map((u) => u.id).join(', ')}). Use the userId instead.`
  );
  process.exit(1);
}

const user = matches[0];
if (password === '--remove') {
  db.removePassword(user.id);
  console.log(`Removed the password for ${user.name} (${user.id}) and signed out all of its sessions.`);
} else {
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
    process.exit(1);
  }
  db.setPassword(user.id, hashPassword(password));
  console.log(`Password set for ${user.name} (${user.id}, ${user.role}).`);
}
await db.flush();
process.exit(0);
