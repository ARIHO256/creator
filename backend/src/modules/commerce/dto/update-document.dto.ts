import { PartialType } from '@nestjs/mapped-types';
import { CreateDocumentDto } from './create-document.dto.js';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {}
