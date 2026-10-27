import { ProjectorResponseDto } from '../../projectors/dto/projector-response.dto';
import { SeatResponseDto } from '../../seats/dto/seat-response.dto';

export class TheaterResponseDto {
  id!: number;
  location!: string;
  capacity!: number;
  projector?: ProjectorResponseDto;
  seats?: SeatResponseDto[];
}
