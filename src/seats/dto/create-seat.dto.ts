import { IsBoolean, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateSeatDto {
  @IsString()
  @IsNotEmpty()
  location!: string;

  @IsBoolean()
  reclining!: boolean;

  @IsInt()
  @Min(1)
  theaterId!: number;
}
