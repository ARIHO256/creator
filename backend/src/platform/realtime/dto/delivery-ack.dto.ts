import { IsString } from 'class-validator';

export class DeliveryAckDto {
  @IsString()
  eventId!: string;
}
