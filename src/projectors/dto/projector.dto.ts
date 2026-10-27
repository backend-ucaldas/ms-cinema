import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class ProjectorDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  brand?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  high?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  width?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  theaterId?: number;
}
