-- Own authentication: credentials, sessions and emailed one-time links move
-- from Supabase Auth into this schema.

-- CreateEnum
CREATE TYPE "AuthTokenType" AS ENUM ('VERIFY_EMAIL', 'RESET_PASSWORD');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_tokens" (
    "id" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "type" "AuthTokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "sessions_expiresAt_idx" ON "sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "auth_tokens_userId_type_idx" ON "auth_tokens"("userId", "type");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Import accounts from Supabase Auth, when this database has one. Ids, bcrypt
-- hashes and confirmation state carry over, so every existing login keeps its
-- password and every profile keeps its orders. Accounts that never signed in
-- have no profile yet; one is created from their sign-up metadata, as the old
-- first-request upsert did. Elsewhere `auth.users` does not exist and this
-- block does nothing.
DO $$
BEGIN
  IF to_regclass('auth.users') IS NOT NULL THEN
    INSERT INTO "users" ("id", "email", "passwordHash", "emailVerifiedAt", "createdAt", "updatedAt")
    SELECT u.id, lower(u.email), u.encrypted_password, u.email_confirmed_at, u.created_at, now()
      FROM auth.users u
     WHERE u.email IS NOT NULL
       AND coalesce(u.encrypted_password, '') <> ''
       AND u.deleted_at IS NULL
    ON CONFLICT DO NOTHING;

    INSERT INTO "profiles" ("id", "nama", "email", "telp", "createdAt", "updatedAt")
    SELECT u.id,
           coalesce(nullif(trim(u.raw_user_meta_data->>'nama'), ''), split_part(u.email, '@', 1)),
           lower(u.email),
           nullif(trim(u.raw_user_meta_data->>'telp'), ''),
           u.created_at,
           now()
      FROM auth.users u
      JOIN "users" nu ON nu.id = u.id
    ON CONFLICT ("id") DO NOTHING;
  END IF;
END $$;

-- AddForeignKey
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_fkey" FOREIGN KEY ("id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
