import { z } from "zod";

const optionalText = z.preprocess((v) => (v === "" ? undefined : v), z.string().min(1).optional());
const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    DATABASE_URL: z
      .string()
      .url()
      .refine((v) => /^postgres(ql)?:/.test(v)),
    DATABASE_SSL: z.enum(["disable", "require", "verify-full"]).default("verify-full"),
    DATABASE_POOL_SIZE: z.coerce.number().int().min(1).max(10).default(2),
    INNGEST_DEV: z.enum(["0", "1"]).default("0"),
    INNGEST_ENV: optionalText,
    INNGEST_SIGNING_KEY: optionalText,
    INNGEST_EVENT_KEY: optionalText,
    S3_BUCKET_NAME: z.string().min(1),
    AWS_REGION: z.string().min(1),
    S3_ENDPOINT: z.preprocess((v) => (v === "" ? undefined : v), z.string().url().optional()),
    AWS_ACCESS_KEY_ID: optionalText,
    AWS_SECRET_ACCESS_KEY: optionalText,
    APP_VERSION: z.string().min(1),
    WORKER_INSTANCE_ID: optionalText,
    WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(32).default(1),
    FFMPEG_PATH: z.string().min(1).default("/usr/bin/ffmpeg"),
    FFMPEG_TIMEOUT_MS: z.coerce.number().int().positive().default(1_800_000),
    MEDIA_TEMP_DIRECTORY: z.string().min(1).default("/var/tmp/snappit-media"),
    HEALTH_PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && value.INNGEST_DEV === "1") {
      ctx.addIssue({
        code: "custom",
        path: ["INNGEST_DEV"],
        message: "Development mode is forbidden in production",
      });
    }
    if (value.INNGEST_DEV !== "1") {
      for (const field of ["INNGEST_SIGNING_KEY", "INNGEST_EVENT_KEY"] as const) {
        if (!value[field])
          ctx.addIssue({ code: "custom", path: [field], message: "Required for cloud mode" });
      }
    }
    if (Boolean(value.AWS_ACCESS_KEY_ID) !== Boolean(value.AWS_SECRET_ACCESS_KEY)) {
      ctx.addIssue({
        code: "custom",
        path: ["AWS_ACCESS_KEY_ID"],
        message: "Supply both AWS credential fields or use the default credential provider",
      });
    }
    if (value.NODE_ENV === "production" && value.DATABASE_SSL === "disable") {
      ctx.addIssue({
        code: "custom",
        path: ["DATABASE_SSL"],
        message: "TLS is required in production",
      });
    }
  });

export function readConfig(env: NodeJS.ProcessEnv) {
  const result = schema.safeParse(env);
  if (!result.success) {
    // Do not print values (URLs and signing keys can contain credentials).
    throw new Error(
      `Invalid worker configuration: ${result.error.issues.map((i) => i.path.join(".")).join(", ")}`,
    );
  }
  return result.data;
}
export type WorkerConfig = ReturnType<typeof readConfig>;
