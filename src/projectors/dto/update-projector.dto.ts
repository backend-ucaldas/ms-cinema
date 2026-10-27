import { PartialType } from '@nestjs/mapped-types';
import { CreateProjectorDto } from './create-projector.dto';

export class UpdateProjectorDto extends PartialType(CreateProjectorDto) {}
