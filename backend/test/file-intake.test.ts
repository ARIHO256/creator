import assert from 'node:assert/strict';
import test from 'node:test';
import { BadRequestException } from '@nestjs/common';
import { normalizeFileIntake } from '../src/common/files/file-intake.js';

test('normalizeFileIntake normalizes valid image metadata', () => {
  const file = normalizeFileIntake({
    name: 'Summer-Campaign.PNG',
    kind: 'image',
    mimeType: 'image/png',
    sizeBytes: 512_000,
    storageProvider: 's3',
    storageKey: 'uploads/user_ronald/2026/03/summer-campaign.png',
    visibility: 'public',
    metadata: { purpose: 'campaign-asset' }
  });

  assert.equal(file.name, 'Summer-Campaign.PNG');
  assert.equal(file.kind, 'image');
  assert.equal(file.mimeType, 'image/png');
  assert.equal(file.storageProvider, 'S3');
  assert.equal(file.storageKey, 'uploads/user_ronald/2026/03/summer-campaign.png');
  assert.equal(file.visibility, 'PUBLIC');
  assert.deepEqual(file.metadata, { purpose: 'campaign-asset' });
});

test('normalizeFileIntake rejects mismatched mime type for kind', () => {
  assert.throws(
    () =>
      normalizeFileIntake({
        name: 'voice-note.mp3',
        kind: 'document',
        mimeType: 'audio/mpeg',
        sizeBytes: 256_000,
        storageKey: 'uploads/u1/voice-note.mp3'
      }),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message.includes('mimeType "audio/mpeg" is not allowed for kind "document"')
  );
});

test('normalizeFileIntake rejects oversize files for kind', () => {
  assert.throws(
    () =>
      normalizeFileIntake({
        name: 'massive-image.jpg',
        kind: 'image',
        mimeType: 'image/jpeg',
        sizeBytes: 30 * 1024 * 1024,
        storageKey: 'uploads/u1/massive-image.jpg'
      }),
    (error: unknown) =>
      error instanceof BadRequestException &&
      error.message.includes('sizeBytes exceeds limit for kind "image"')
  );
});
