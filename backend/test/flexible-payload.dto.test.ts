import assert from 'node:assert/strict';
import test from 'node:test';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateLiveStudioDto } from '../src/modules/live/dto/update-live-studio.dto.js';

test('UpdateLiveStudioDto accepts live studio patch bodies before flexible pipe injects payload', () => {
  const instance = plainToInstance(UpdateLiveStudioDto, {
    data: {
      mode: 'lobby',
      micOn: true
    }
  });

  const errors = validateSync(instance as object, {
    whitelist: true,
    forbidNonWhitelisted: false
  });

  assert.deepEqual(errors, []);
});
