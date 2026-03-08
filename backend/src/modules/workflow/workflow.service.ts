import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { normalizeFileIntake } from '../../common/files/file-intake.js';
import { AppRecordsService } from '../../platform/app-records.service.js';
import { CreateUploadDto } from './dto/create-upload.dto.js';

@Injectable()
export class WorkflowService {
  constructor(private readonly records: AppRecordsService) {}

  uploads(userId: string) { return this.records.list('workflow','upload',userId).then((rows)=>rows.map((r)=>({id:r.entityId,...(r.payload as any)}))); }
  createUpload(userId: string, body: CreateUploadDto) {
    const id = body.id || randomUUID();
    const file = normalizeFileIntake(body);
    return this.records.create(
      'workflow',
      'upload',
      {
        name: file.name,
        kind: file.kind,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        extension: file.extension,
        checksum: file.checksum,
        storageProvider: file.storageProvider,
        storageKey: file.storageKey,
        url: file.url,
        visibility: file.visibility,
        purpose: body.purpose ?? 'general',
        domain: body.domain ?? null,
        entityType: body.entityType ?? null,
        entityId: body.entityId ?? null,
        status: body.status ?? 'UPLOADED',
        metadata: body.metadata ?? {},
        createdAt: new Date().toISOString()
      },
      id,
      userId
    );
  }

  onboarding(userId: string) { return this.records.getByEntityId('workflow','onboarding','main',userId).then((r)=>r.payload).catch(()=>({status:'draft'})); }
  patchOnboarding(userId: string, body: any) { return this.records.upsert('workflow','onboarding','main',body,userId); }
  resetOnboarding(userId: string) { return this.records.upsert('workflow','onboarding','main',{status:'draft',steps:[]},userId); }
  submitOnboarding(userId: string, body: any) { return this.records.upsert('workflow','onboarding','main',{...body,status:'submitted',submittedAt:new Date().toISOString()},userId); }

  accountApproval(userId: string) { return this.records.getByEntityId('workflow','account_approval','main',userId).then((r)=>r.payload).catch(()=>({status:'pending'})); }
  patchAccountApproval(userId: string, body: any) { return this.records.upsert('workflow','account_approval','main',body,userId); }
  refreshAccountApproval(userId: string) { return this.accountApproval(userId); }
  resubmitAccountApproval(userId: string, body: any) { return this.records.upsert('workflow','account_approval','main',{...body,status:'resubmitted'},userId); }
  devApprove(userId: string) { return this.records.upsert('workflow','account_approval','main',{status:'approved',approvedAt:new Date().toISOString()},userId); }

  contentApprovals(userId: string) { return this.records.list('workflow','content_approval',userId).then((rows)=>rows.map((r)=>({id:r.entityId,...(r.payload as any)}))); }
  contentApproval(userId: string, id: string) { return this.records.getByEntityId('workflow','content_approval',id,userId).then((r)=>({id:r.entityId,...(r.payload as any)})); }
  createContentApproval(userId: string, body: any) { const id = body.id || randomUUID(); return this.records.create('workflow','content_approval',body,id,userId); }
  patchContentApproval(userId: string, id: string, body: any) { return this.records.update('workflow','content_approval',id,body,userId); }

  async nudge(userId: string, id: string) { const rec = await this.records.getByEntityId('workflow','content_approval',id,userId); return this.records.update('workflow','content_approval',id,{...(rec.payload as any),lastNudgedAt:new Date().toISOString()},userId); }
  async withdraw(userId: string, id: string) { const rec = await this.records.getByEntityId('workflow','content_approval',id,userId); return this.records.update('workflow','content_approval',id,{...(rec.payload as any),status:'withdrawn'},userId); }
  async resubmit(userId: string, id: string, body: any) { const rec = await this.records.getByEntityId('workflow','content_approval',id,userId); return this.records.update('workflow','content_approval',id,{...(rec.payload as any),...body,status:'resubmitted'},userId); }
}
