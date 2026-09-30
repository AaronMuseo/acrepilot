import type { Ack, Operation, ServerRecord } from '../../../packages/contracts';
import type { Repository } from './repository';
export interface SyncTransport {
  push(operations: Operation[]): Promise<{ acknowledgements: Ack[] }>;
  pull(cursor: string): Promise<{ records: ServerRecord[]; cursor: string; hasMore: boolean }>;
}
export class SyncEngine {
  private flight?: Promise<void>;
  constructor(readonly repository: Repository, readonly transport: SyncTransport) {}
  run(): Promise<void> {
    if (!this.flight) this.flight = this.sync().finally(() => { this.flight = undefined; });
    return this.flight;
  }
  private async sync() {
    // One operation per request in P0 preserves dependency failures within batches.
    for (let i = 0; i < 100; i++) {
      const operation = this.repository.batch()[0]; if (!operation) break;
      const result = await this.transport.push([operation]);
      const ack = result.acknowledgements.find(a => a.operationId === operation.operationId);
      if (!ack) throw new Error('MISSING_ACKNOWLEDGEMENT');
      this.repository.acknowledge(ack);
      if (ack.status !== 'accepted') break;
    }
    for (let i = 0; i < 100; i++) {
      const result = await this.transport.pull(this.repository.meta('cursor') ?? '0');
      this.repository.pull(result.records, result.cursor);
      if (!result.hasMore) break;
    }
    this.repository.setMeta('lastSync', new Date().toISOString());
  }
}
