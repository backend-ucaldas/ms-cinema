import { IsDateString, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateMovieDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  duration!: number;

  @IsDateString()
  date!: string;
}
