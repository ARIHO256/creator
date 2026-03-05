import { Injectable } from '@nestjs/common';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class ReviewsService {
  constructor(private readonly records: AppRecordsService) {}

  dashboard(userId: string) {
    return this.records.getByEntityId('reviews', 'dashboard', 'main', userId).then((r) => r.payload).catch(() => ({ score: 0, trends: [] }));
  }
}
