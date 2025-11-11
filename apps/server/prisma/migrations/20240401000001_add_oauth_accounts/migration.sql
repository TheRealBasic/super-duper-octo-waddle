CREATE TABLE "OAuthAccount" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "provider" TEXT NOT NULL,
  "providerAccountId" TEXT NOT NULL,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  UNIQUE ("provider", "providerAccountId")
);
