import { ScreeningResponseDto } from '../../screenings/dto/screening-response.dto';

export class MovieResponseDto {
  id!: number;
  name!: string;
  duration!: number;
  date!: string;
  screenings?: ScreeningResponseDto[];
}
