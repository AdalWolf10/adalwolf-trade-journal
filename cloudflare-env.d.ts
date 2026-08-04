declare module "cloudflare:workers" {
  export const env: {
    DB?: D1Database;
    DEVICE_FILES?: R2Bucket;
    DEVICE_FILES_STORAGE_LIMIT_BYTES?: number | string;
  } & Record<string, unknown>;
}

type D1Value = ArrayBuffer | boolean | null | number | string;

interface D1ExecResult {
  count: number;
  duration: number;
}

interface D1Result<T = Record<string, unknown>> {
  error?: string;
  meta: Record<string, unknown>;
  results?: T[];
  success: boolean;
}

interface D1PreparedStatement {
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  bind(...values: D1Value[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(column?: string): Promise<T | null>;
  raw<T = unknown[]>(): Promise<T[]>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

interface D1Database {
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  dump(): Promise<ArrayBuffer>;
  exec(query: string): Promise<D1ExecResult>;
  prepare(query: string): D1PreparedStatement;
}

interface Fetcher {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

type R2Range =
  | {
      length?: number;
      offset: number;
    }
  | {
      suffix: number;
    };

type R2ObjectBodyValue =
  | ArrayBuffer
  | ArrayBufferView<ArrayBufferLike>
  | Blob
  | null
  | ReadableStream
  | string;

type R2HTTPMetadata = Record<string, string | undefined>;

interface R2Object {
  checksums?: Record<string, ArrayBuffer | string | undefined>;
  customMetadata?: Record<string, string>;
  httpEtag: string;
  httpMetadata?: R2HTTPMetadata;
  key: string;
  size: number;
  uploaded: Date;
  version?: string;
  writeHttpMetadata(headers: Headers): void;
}

interface R2ObjectBody extends R2Object {
  arrayBuffer(): Promise<ArrayBuffer>;
  blob(): Promise<Blob>;
  body: ReadableStream;
  bodyUsed: boolean;
  json<T = unknown>(): Promise<T>;
  text(): Promise<string>;
}

interface R2Bucket {
  delete(key: string): Promise<void>;
  get(key: string, options?: { range?: R2Range }): Promise<R2ObjectBody | null>;
  head(key: string): Promise<R2Object | null>;
  put(
    key: string,
    value: R2ObjectBodyValue,
    options?: {
      customMetadata?: Record<string, string>;
      httpMetadata?: R2HTTPMetadata;
    },
  ): Promise<R2Object>;
}
