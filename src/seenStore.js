// Tracks which report codes we've already announced per uploader, persisted
// to a small JSON file so restarts don't re-announce old reports.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { config } from './config.js';

const MAX_CODES_PER_USER = 50;

function load() {
  if (!existsSync(config.seenReportsPath)) {
    return {};
  }
  try {
    return JSON.parse(readFileSync(config.seenReportsPath, 'utf-8'));
  } catch {
    return {};
  }
}

function save(state) {
  mkdirSync(path.dirname(config.seenReportsPath), { recursive: true });
  writeFileSync(config.seenReportsPath, JSON.stringify(state, null, 2));
}

export class SeenStore {
  constructor() {
    this.state = load();
  }

  hasUserBeenSeenBefore(userId) {
    return Array.isArray(this.state[String(userId)]);
  }

  isSeen(userId, code) {
    const codes = this.state[String(userId)] ?? [];
    return codes.includes(code);
  }

  markSeen(userId, code) {
    const key = String(userId);
    const codes = this.state[key] ?? [];
    if (!codes.includes(code)) {
      codes.unshift(code);
      this.state[key] = codes.slice(0, MAX_CODES_PER_USER);
    }
  }

  persist() {
    save(this.state);
  }
}
