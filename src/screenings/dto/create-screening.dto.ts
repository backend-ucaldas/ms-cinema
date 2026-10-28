import { IsDateString, IsInt, Min } from 'class-validator';

export class CreateScreeningDto {
  @IsDateString()
  scheduledAt!: string;

  @IsInt()
  @Min(1)
  theaterId!: number;

  @IsInt()
  @Min(1)
  movieId!: number;
}
