import pool from "@/lib/mysql";

export type MediaAsset = {
  id: string;
  contentType: string;
  expectedSize: number;
  receivedSize: number;
  nextChunk: number;
  totalChunks: number;
  complete: boolean;
};

type MediaAssetRow = {
  id: string;
  content_type: string;
  expected_size: number;
  received_size: number;
  next_chunk: number;
  total_chunks: number;
  is_complete: number;
  data?: Buffer;
};

let ensureTablePromise: Promise<void> | null = null;

async function ensureMediaTable(): Promise<void> {
  if (!ensureTablePromise) {
    ensureTablePromise = pool
      .execute(
        `CREATE TABLE IF NOT EXISTS app_media_assets (
          id CHAR(36) NOT NULL,
          content_type VARCHAR(100) NOT NULL,
          expected_size INT UNSIGNED NOT NULL,
          received_size INT UNSIGNED NOT NULL DEFAULT 0,
          next_chunk INT UNSIGNED NOT NULL DEFAULT 0,
          total_chunks INT UNSIGNED NOT NULL DEFAULT 1,
          is_complete TINYINT(1) NOT NULL DEFAULT 0,
          data LONGBLOB NOT NULL,
          created_at DATETIME NOT NULL,
          updated_at DATETIME NOT NULL,
          PRIMARY KEY (id),
          KEY idx_app_media_assets_updated_at (updated_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`
      )
      .then(() => undefined)
      .catch((error) => {
        ensureTablePromise = null;
        throw error;
      });
  }

  await ensureTablePromise;
}

function toMediaAsset(row: MediaAssetRow): MediaAsset {
  return {
    id: row.id,
    contentType: row.content_type,
    expectedSize: Number(row.expected_size),
    receivedSize: Number(row.received_size),
    nextChunk: Number(row.next_chunk),
    totalChunks: Number(row.total_chunks),
    complete: Number(row.is_complete) === 1,
  };
}

export async function createMediaAsset(params: {
  id: string;
  contentType: string;
  expectedSize: number;
  totalChunks: number;
  data: Buffer;
  nextChunk: number;
  isComplete: boolean;
}): Promise<MediaAsset> {
  await ensureMediaTable();
  const now = new Date();

  await pool.execute(
    `INSERT INTO app_media_assets
      (id, content_type, expected_size, received_size, next_chunk, total_chunks, is_complete, data, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      params.id,
      params.contentType,
      params.expectedSize,
      params.data.byteLength,
      params.nextChunk,
      params.totalChunks,
      params.isComplete ? 1 : 0,
      params.data,
      now,
      now,
    ]
  );

  return {
    id: params.id,
    contentType: params.contentType,
    expectedSize: params.expectedSize,
    receivedSize: params.data.byteLength,
    nextChunk: params.nextChunk,
    totalChunks: params.totalChunks,
    complete: params.isComplete,
  };
}

export async function getMediaAsset(id: string): Promise<MediaAssetRow | null> {
  await ensureMediaTable();
  const [rows] = await pool.execute(
    `SELECT id, content_type, expected_size, received_size, next_chunk, total_chunks, is_complete, data
     FROM app_media_assets
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  const row = (rows as MediaAssetRow[])[0];
  return row ?? null;
}

export async function getMediaAssetState(id: string): Promise<MediaAsset | null> {
  await ensureMediaTable();
  const [rows] = await pool.execute(
    `SELECT id, content_type, expected_size, received_size, next_chunk, total_chunks, is_complete
     FROM app_media_assets
     WHERE id = ?
     LIMIT 1`,
    [id]
  );

  const row = (rows as MediaAssetRow[])[0];
  return row ? toMediaAsset(row) : null;
}

export async function appendMediaAssetChunk(params: {
  id: string;
  chunkIndex: number;
  data: Buffer;
  isComplete: boolean;
}): Promise<MediaAsset | null> {
  await ensureMediaTable();
  const nextChunk = params.chunkIndex + 1;
  const now = new Date();

  const [result] = await pool.execute(
    `UPDATE app_media_assets
     SET data = CONCAT(data, CAST(? AS BINARY)),
         received_size = received_size + ?,
         next_chunk = ?,
         is_complete = ?,
         updated_at = ?
     WHERE id = ?
       AND next_chunk = ?
       AND is_complete = 0`,
    [
      params.data,
      params.data.byteLength,
      nextChunk,
      params.isComplete ? 1 : 0,
      now,
      params.id,
      params.chunkIndex,
    ]
  );

  if ((result as { affectedRows?: number }).affectedRows !== 1) {
    return null;
  }

  return getMediaAssetState(params.id);
}
