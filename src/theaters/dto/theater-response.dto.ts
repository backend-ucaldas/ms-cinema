import { ProjectorResponseDto } from '../../projectors/dto/projector-response.dto';

export class TheaterResponseDto {
  id!: number;
  location!: string;
  capacity!: number;
  projector?: ProjectorResponseDto;
}
