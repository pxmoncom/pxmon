/**
 * JSON file backup and restore service.
 */

import * as fs from 'fs';
import * as path from 'path';
import { AgentRecord } from './agent-service';

export interface BackupMetadata {
  version: string;
  timestamp: number;
  agentCount: number;
  checksum: string;
}

export interface BackupData {
  metadata: BackupMetadata;
  agents: AgentRecord[];
}

function simpleChecksum(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export class BackupService {
  private backupDir: string;
  private maxBackups: number;

  constructor(backupDir: string = './backups', maxBackups: number = 10) {
    this.backupDir = backupDir;
    this.maxBackups = maxBackups;
    this.ensureDir();
  }

  private ensureDir(): void {
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  save(agents: AgentRecord[], label: string = 'auto'): string {
    const agentJson = JSON.stringify(agents);
    const checksum = simpleChecksum(agentJson);

    const backup: BackupData = {
      metadata: {
        version: '0.1.0',
        timestamp: Date.now(),
        agentCount: agents.length,
        checksum,
      },
      agents,
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `pxmon_backup_${label}_${timestamp}.json`;
    const filepath = path.join(this.backupDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(backup, null, 2), 'utf-8');
    this.pruneOldBackups();

    return filepath;
  }

  load(filepath: string): BackupData | { error: string } {
    if (!fs.existsSync(filepath)) {
      return { error: `Backup file not found: ${filepath}` };
    }

    try {
      const raw = fs.readFileSync(filepath, 'utf-8');
      const data: BackupData = JSON.parse(raw);

      if (!data.metadata || !data.agents) {
        return { error: 'Invalid backup format' };
      }

      const agentJson = JSON.stringify(data.agents);
      const checksum = simpleChecksum(agentJson);
      if (checksum !== data.metadata.checksum) {
        return { error: 'Backup checksum mismatch - data may be corrupted' };
      }

      return data;
    } catch (err) {
      return { error: `Failed to parse backup: ${String(err)}` };
    }
  }

  loadLatest(): BackupData | { error: string } {
    const backups = this.listBackups();
    if (backups.length === 0) {
      return { error: 'No backups found' };
    }

    const latest = backups[backups.length - 1];
    return this.load(latest.filepath);
  }

  listBackups(): Array<{ filename: string; filepath: string; timestamp: number; agentCount: number }> {
    this.ensureDir();
    const files = fs.readdirSync(this.backupDir)
      .filter(f => f.startsWith('pxmon_backup_') && f.endsWith('.json'))
      .sort();

    const results: Array<{ filename: string; filepath: string; timestamp: number; agentCount: number }> = [];

    for (const filename of files) {
      const filepath = path.join(this.backupDir, filename);
      try {
        const raw = fs.readFileSync(filepath, 'utf-8');
        const data: BackupData = JSON.parse(raw);
        results.push({
          filename,
          filepath,
          timestamp: data.metadata.timestamp,
          agentCount: data.metadata.agentCount,
        });
      } catch {
        results.push({ filename, filepath, timestamp: 0, agentCount: 0 });
      }
    }

    return results;
  }

  deleteBackup(filepath: string): boolean {
    if (!fs.existsSync(filepath)) return false;
    fs.unlinkSync(filepath);
    return true;
  }

  private pruneOldBackups(): void {
    const backups = this.listBackups();
    if (backups.length <= this.maxBackups) return;

    const toDelete = backups.slice(0, backups.length - this.maxBackups);
    for (const backup of toDelete) {
      try {
        fs.unlinkSync(backup.filepath);
      } catch {
        // Ignore deletion errors
      }
    }
  }

  exportToString(agents: AgentRecord[]): string {
    const agentJson = JSON.stringify(agents);
    const checksum = simpleChecksum(agentJson);
    const backup: BackupData = {
      metadata: {
        version: '0.1.0',
        timestamp: Date.now(),
        agentCount: agents.length,
        checksum,
      },
      agents,
    };
    return JSON.stringify(backup);
  }

  importFromString(raw: string): BackupData | { error: string } {
    try {
      const data: BackupData = JSON.parse(raw);
      if (!data.metadata || !data.agents) {
        return { error: 'Invalid backup format' };
      }
      return data;
    } catch (err) {
      return { error: `Failed to parse: ${String(err)}` };
    }
  }
}