import { IsInt, IsString, Max, Min } from 'class-validator';

export class CreateTheaterDto {
  @IsString()
  location!: string;

  @IsInt()
  @Min(1)
  @Max(1000)
  capacity!: number;
}
