import { IsString, IsOptional, IsBoolean, IsInt, IsEnum, Min } from 'class-validator';

export enum ContentType {
  PAGE_TEXT = 'PAGE_TEXT',
  GALLERY = 'GALLERY',
  REVIEW = 'REVIEW',
  CASE = 'CASE',
  FAQ = 'FAQ',
  SOLUTION = 'SOLUTION',
}

export class CreateContentBlockDto {
  @IsEnum(ContentType)
  type: ContentType;

  @IsOptional()
  @IsString()
  pageSlug?: string;

  @IsString()
  key: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imageAlt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class UpdateContentBlockDto {
  @IsOptional()
  @IsEnum(ContentType)
  type?: ContentType;

  @IsOptional()
  @IsString()
  pageSlug?: string;

  @IsOptional()
  @IsString()
  key?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  subtitle?: string;

  @IsOptional()
  @IsString()
  body?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  imageAlt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}

export class CreateContentPhotoDto {
  @IsString()
  galleryKey: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  visible?: boolean;
}
