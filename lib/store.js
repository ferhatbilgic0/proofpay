import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

// A small JSON file store. Enough for a hackathon demo running as a single instance.
const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'db.json');

function load() {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return { contracts: {} };
  }
}

function persist(db) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(db, null, 2));
}

export function newId(prefix) {
  return `${prefix}_${crypto.randomBytes(5).toString('hex')}`;
}

export function listContracts() {
  return Object.values(load().contracts).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function getContract(id) {
  return load().contracts[id] || null;
}

export function saveContract(contract) {
  const db = load();
  contract.updatedAt = new Date().toISOString();
  db.contracts[contract.id] = contract;
  persist(db);
  return contract;
}
