import { Injectable } from '@nestjs/common';
import { AppRecordsService } from '../../platform/app-records.service.js';

@Injectable()
export class DashboardService {
  constructor(private readonly records: AppRecordsService) {}

  health() {
    return { status: 'ok' };
  }

  routes() {
    return {
      groups: ['auth', 'dashboard', 'discovery', 'collaboration', 'live', 'adz', 'finance', 'settings', 'workflow', 'reviews']
    };
  }

  async landingContent() {
    const rec = await this.records
      .getByEntityId('dashboard', 'landing', 'public')
      .catch(() => this.records.create('dashboard', 'landing', { title: 'MyLiveDealz Creator', subtitle: 'Creator commerce workspace' }, 'public'));
    return rec.payload;
  }

  async appBootstrap(userId: string) {
    const rec = await this.records
      .getByEntityId('dashboard', 'bootstrap', 'default', userId)
      .catch(() => this.records.create('dashboard', 'bootstrap', { featureFlags: {}, navBadges: {} }, 'default', userId));
    return rec.payload;
  }

  async feed(userId: string) {
    const rec = await this.records
      .getByEntityId('dashboard', 'feed', 'home', userId)
      .catch(() => this.records.create('dashboard', 'feed', { hero: { title: 'Welcome back' }, quickStats: [] }, 'home', userId));
    return rec.payload;
  }

  async myDay(userId: string) {
    const rec = await this.records
      .getByEntityId('dashboard', 'my_day', 'today', userId)
      .catch(() => this.records.create('dashboard', 'my_day', { agenda: [], tasks: [] }, 'today', userId));
    return rec.payload;
  }
}
