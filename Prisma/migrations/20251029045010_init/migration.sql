-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "capital" TEXT,
    "region" TEXT,
    "population" INTEGER NOT NULL,
    "currency_code" TEXT,
    "exchange_rate" DOUBLE PRECISION,
    "estimated_gdp" DOUBLE PRECISION,
    "flag_url" TEXT,
    "last_refreshed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiStatus" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "total_countries" INTEGER NOT NULL,
    "last_refreshed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApiStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");
