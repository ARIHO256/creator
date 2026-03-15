import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';

type DtoConstructor<T> = new () => T;

@Injectable()
export class FlexiblePayloadValidationPipe<T extends { payload: Record<string, unknown> }> implements PipeTransform {
  constructor(private readonly dtoClass: DtoConstructor<T>) {}

  transform(value: unknown) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException('Invalid payload');
    }

    const rawPayload = value as Record<string, unknown>;
    const instance = plainToInstance(
      this.dtoClass,
      {
        ...rawPayload,
        payload: rawPayload
      },
      { enableImplicitConversion: true }
    );

    const errors = validateSync(instance as object, {
      whitelist: true,
      forbidNonWhitelisted: false
    });

    if (errors.length > 0) {
      const messages = errors
        .flatMap((error) => Object.values(error.constraints ?? {}))
        .filter((message): message is string => typeof message === 'string' && message.length > 0);
      throw new BadRequestException(messages.length > 0 ? messages : 'Invalid payload');
    }

    return instance;
  }
}
