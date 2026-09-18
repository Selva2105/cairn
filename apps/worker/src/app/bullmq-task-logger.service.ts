import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { Job } from 'bullmq';

// Log retention policy: keep logs for 2 days
const RETENTION_DAYS = 2;

/**
 * Formats timestamps in 12-hour format (e.g. "12:05:30 AM" / "09/18/2026, 12:05:30 AM"),
 * logs BullMQ task lifecycle events to console, and writes physical rotated daily log files
 * in logs/bullmq/ with an automatic 2-day retention purge.
 */
@Injectable()
export class BullmqTaskLogger implements OnModuleInit {
  private readonly logger = new Logger('BullMQ');
  private readonly logDir = path.resolve(process.cwd(), 'logs', 'bullmq');

  async onModuleInit(): Promise<void> {
    this.ensureLogDir();
    await this.cleanOldLogs();
  }

  private ensureLogDir(): void {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
      this.logger.error(
        `Failed to create BullMQ log directory: ${(err as Error).message}`,
      );
    }
  }

  private getLogFilePath(date: Date = new Date()): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    return path.join(this.logDir, `bullmq-${yyyy}-${mm}-${dd}.log`);
  }

  private async writeToFile(entry: string): Promise<void> {
    try {
      this.ensureLogDir();
      const filePath = this.getLogFilePath();
      await fs.promises.appendFile(filePath, entry + '\n', 'utf8');
    } catch (err) {
      this.logger.warn(
        `Could not write to BullMQ log file: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Deletes physical log files older than RETENTION_DAYS (2 days).
   */
  async cleanOldLogs(): Promise<void> {
    try {
      if (!fs.existsSync(this.logDir)) return;
      const files = await fs.promises.readdir(this.logDir);
      const now = Date.now();
      const maxAgeMs = RETENTION_DAYS * 24 * 60 * 60 * 1000;

      for (const file of files) {
        if (!file.startsWith('bullmq-') || !file.endsWith('.log')) continue;
        const filePath = path.join(this.logDir, file);
        const stats = await fs.promises.stat(filePath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.promises.unlink(filePath);
          this.logger.log(
            `Purged expired BullMQ log file (> ${RETENTION_DAYS} days): ${file}`,
          );
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to clean old logs: ${(err as Error).message}`);
    }
  }

  /**
   * Formats current time in 12-hour format: "hh:mm:ss AM/PM"
   */
  formatTime(date: Date = new Date()): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  /**
   * Formats date and time in 12-hour format: "MM/DD/YYYY, hh:mm:ss AM/PM"
   */
  formatDateTime(date: Date = new Date()): string {
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  }

  logEnqueued(queue: string, jobName: string, details?: string): void {
    const time = this.formatTime();
    const dateTime = this.formatDateTime();
    const message = `[${time}] 📥 ENQUEUED  | Queue: [${queue}] | Job: "${jobName}"${details ? ` | ${details}` : ''}`;
    const fileEntry = `[${dateTime}] [ENQUEUED]  | Queue: [${queue}] | Job: "${jobName}"${details ? ` | ${details}` : ''}`;

    this.logger.log(message);
    void this.writeToFile(fileEntry);
  }

  /**
   * Evaluates if a job result represents an actionable event (non-empty/non-idle).
   * For pipeline scans, if all counts are 0, no action was taken.
   */
  hasAction(result?: unknown): boolean {
    if (result === undefined || result === null) return true;
    if (
      typeof result === 'object' &&
      result !== null &&
      'ingested' in result &&
      'documentsScanned' in result
    ) {
      const summary = result as Record<string, number>;
      return (
        (summary.ingested ?? 0) > 0 ||
        (summary.documentsScanned ?? 0) > 0 ||
        (summary.billsScanned ?? 0) > 0 ||
        (summary.processed ?? 0) > 0 ||
        (summary.notified ?? 0) > 0 ||
        (summary.failedConnectors ?? 0) > 0
      );
    }
    return true;
  }

  logActive(queue: string, job: Job): void {
    // Suppress periodic idle scan ticks from writing log entries before any action is confirmed
    const isRepeatScan =
      job.name === 'scheduled-pipeline-run' ||
      (typeof job.id === 'string' && job.id.startsWith('repeat:'));
    if (isRepeatScan) {
      return;
    }

    const time = this.formatTime();
    const dateTime = this.formatDateTime();
    const attempt = job.attemptsMade + 1;
    const message = `[${time}] ⏳ ACTIVE    | Queue: [${queue}] | Job: #${job.id} "${job.name}" (attempt ${attempt})`;
    const fileEntry = `[${dateTime}] [ACTIVE]    | Queue: [${queue}] | Job: #${job.id} "${job.name}" (attempt ${attempt})`;

    this.logger.log(message);
    void this.writeToFile(fileEntry);
  }

  logCompleted(queue: string, job: Job, result?: unknown): void {
    // Only write logs if an action was actually taken
    if (!this.hasAction(result)) {
      return;
    }

    const time = this.formatTime();
    const dateTime = this.formatDateTime();
    const duration = job.processedOn ? `${Date.now() - job.processedOn}ms` : '';
    const details = result ? ` | Result: ${JSON.stringify(result)}` : '';
    const message = `[${time}] ✅ COMPLETED | Queue: [${queue}] | Job: #${job.id} "${job.name}" (${duration})${details}`;
    const fileEntry = `[${dateTime}] [COMPLETED] | Queue: [${queue}] | Job: #${job.id} "${job.name}" (${duration})${details}`;

    this.logger.log(message);
    void this.writeToFile(fileEntry);
  }

  logFailed(queue: string, job: Job | undefined, error: Error): void {
    const time = this.formatTime();
    const dateTime = this.formatDateTime();
    const id = job ? `#${job.id} "${job.name}"` : 'unknown';
    const attempt = job
      ? `(attempt ${job.attemptsMade + 1}/${job.opts?.attempts ?? 1})`
      : '';
    const message = `[${time}] ❌ FAILED    | Queue: [${queue}] | Job: ${id} ${attempt} | Error: ${error.message}`;
    const fileEntry = `[${dateTime}] [FAILED]    | Queue: [${queue}] | Job: ${id} ${attempt} | Error: ${error.message}${error.stack ? `\n${error.stack}` : ''}`;

    this.logger.error(message, error.stack);
    void this.writeToFile(fileEntry);
  }
}
