import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateProjectorDto {
  @IsString()
  @IsNotEmpty()
  brand!: string;

  @IsInt()
  @Min(1)
  high!: number;

  @IsInt()
  @Min(1)
  width!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  theaterId?: number;
}
