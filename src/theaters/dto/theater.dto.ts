import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class TheaterDto {
  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1000)
  capacity?: number;
}
