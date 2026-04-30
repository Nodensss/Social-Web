import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { badRequest } from "./errors";

export type UploadObjectInput = {
  bytes: Buffer | Uint8Array;
  contentType: string;
  originalName?: string;
  prefix?: string;
};

const IMAGE_CONTENT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

function extensionFromName(name?: string): string {
  const ext = path
    .extname(name ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9.]/g, "");
  if (ext && ext.length <= 8) return ext;
  return ".jpg";
}

function buildKey(prefix = "toys", originalName?: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  return `${prefix}/${date}/${randomUUID()}${extensionFromName(originalName)}`;
}

function s3Configured(): boolean {
  return Boolean(
    process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
  );
}

function getS3Client(): S3Client {
  return new S3Client({
    region: process.env.S3_REGION || "auto",
    endpoint: process.env.S3_ENDPOINT || undefined,
    forcePathStyle: Boolean(process.env.S3_ENDPOINT),
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
    },
  });
}

function publicS3Url(key: string): string {
  const publicUrl = process.env.S3_PUBLIC_URL?.replace(/\/$/, "");
  if (publicUrl) return `${publicUrl}/${key}`;

  const bucket = process.env.S3_BUCKET;
  const endpoint = process.env.S3_ENDPOINT?.replace(/\/$/, "");
  if (endpoint && bucket) return `${endpoint}/${bucket}/${key}`;

  const region = process.env.S3_REGION || "us-east-1";
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

async function uploadLocal(input: UploadObjectInput, key: string): Promise<string> {
  const uploadRoot = path.resolve(process.cwd(), process.env.LOCAL_UPLOAD_DIR ?? "public/uploads");
  const filePath = path.resolve(uploadRoot, key);
  if (!filePath.startsWith(uploadRoot)) throw badRequest("Некорректный путь загрузки.");

  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, input.bytes);

  const publicBase =
    process.env.LOCAL_UPLOAD_PUBLIC_URL ??
    `${(process.env.APP_URL ?? "").replace(/\/$/, "")}/uploads`;
  return `${publicBase.replace(/\/$/, "")}/${key}`;
}

export async function uploadObject(
  input: UploadObjectInput,
): Promise<{ key: string; url: string }> {
  if (!IMAGE_CONTENT_TYPES.has(input.contentType)) {
    throw badRequest("Можно загрузить только изображение JPG, PNG, WebP или GIF.");
  }

  const key = buildKey(input.prefix, input.originalName);
  if (!s3Configured()) {
    return { key, url: await uploadLocal(input, key) };
  }

  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: input.bytes,
      ContentType: input.contentType,
    }),
  );

  return { key, url: publicS3Url(key) };
}

export async function copyRemoteImageToStorage(
  sourceUrl: string,
  prefix = "processed",
): Promise<string> {
  if (sourceUrl.startsWith("/uploads/") || sourceUrl.includes("/uploads/")) return sourceUrl;

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Не удалось скачать обработанное изображение ${response.status}`);
  }

  const remoteContentType = response.headers.get("content-type")?.split(";")[0] ?? "";
  const contentType = IMAGE_CONTENT_TYPES.has(remoteContentType) ? remoteContentType : "image/png";
  const bytes = Buffer.from(await response.arrayBuffer());
  const uploaded = await uploadObject({
    bytes,
    contentType,
    originalName: `processed-${randomUUID()}.png`,
    prefix,
  });
  return uploaded.url;
}
