import { Injectable } from '@nestjs/common';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class RegulatoryService {
  constructor(private readonly records: AppRecordsService) {}

  compliance(userId: string) {
    return this.records.getByEntityId('seller_workspace', 'compliance', 'main', userId).then((r) => r.payload).catch(() => ({ docs: [], queue: [], autoRules: [] }));
  }

  desks(userId: string) {
    return this.records.getByEntityId('regulatory', 'desks', 'main', userId).then((r) => r.payload).catch(() => ({ desks: [] }));
  }

  desk(userId: string, slug: string) {
    return this.records.getByEntityId('regulatory', 'desk', slug, userId).then((r) => r.payload).catch(() => ({ slug, items: [] }));
  }
}
