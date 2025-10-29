const { PrismaClient } = require('@prisma/client');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { createCanvas } = require('@napi-rs/canvas');

const prisma = new PrismaClient();
const cacheDir = path.resolve(process.cwd(), 'cache');
const imagePath = path.join(cacheDir, 'summary.png');

// Custom Error for external API failures
class ExternalApiError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ExternalApiError';
  }
}

/**
 * Fetches data from both external APIs concurrently.
 * Throws an ExternalApiError if any API fails.
 */
const fetchExternalData = async () => {
  try {
    const [countriesResponse, ratesResponse] = await Promise.all([
      axios.get(process.env.COUNTRIES_API_URL, { timeout: 10000 }),
      axios.get(process.env.EXCHANGE_RATE_API_URL, { timeout: 10000 })
    ]);
    
    return {
      countriesData: countriesResponse.data,
      ratesData: ratesResponse.data.rates
    };
  } catch (error) {
    console.error("External API fetch failed:", error.message);
    // As per requirement, return 503 if *either* API fails
    throw new ExternalApiError("Could not fetch data from one or more external APIs");
  }
};

/**
 * Generates and saves the summary.png image to the /cache directory.
 */
const generateSummaryImage = async () => {
  const status = await prisma.apiStatus.findUnique({ where: { id: 1 } });
  const topCountries = await prisma.country.findMany({
    orderBy: { estimated_gdp: 'desc' },
    take: 5,
  });

  if (!status) return; // Should not happen after a refresh

  // Create cache directory if it doesn't exist
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
  }

  // Create canvas
  const canvas = createCanvas(600, 400);
  const ctx = canvas.getContext('2d');

  // Background
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, 600, 400);

  // Text Style
  ctx.fillStyle = '#000000';
  ctx.font = '20px Arial';

  // Draw Data
  ctx.fillText(`Total Countries: ${status.total_countries}`, 50, 50);
  ctx.fillText(`Last Refresh: ${new Date(status.last_refreshed_at).toUTCString()}`, 50, 80);

  ctx.font = 'bold 22px Arial';
  ctx.fillText('Top 5 Countries by Estimated GDP (USD)', 50, 140);
  
  ctx.font = '18px Arial';
  topCountries.forEach((country, index) => {
    const gdp = country.estimated_gdp ? `$${Number(country.estimated_gdp).toFixed(0).toLocaleString()}` : 'N/A';
    ctx.fillText(`${index + 1}. ${country.name}: ${gdp}`, 60, 180 + (index * 30));
  });

  // Save image
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(imagePath, buffer);
};

/**
 * Main service for POST /countries/refresh
 * Fetches, processes, and saves data to the DB.
 */
const refreshData = async () => {
  const { countriesData, ratesData } = await fetchExternalData();

  const refreshTime = new Date();

  // Use a transaction to ensure all updates succeed or fail together
  await prisma.$transaction(async (tx) => {
    for (const country of countriesData) {
      let currency_code = null;
      let exchange_rate = null;
      let estimated_gdp = 0; // Default to 0 as per rule

      // Rule: If a country has multiple currencies, store only the first.
      if (country.currencies && country.currencies.length > 0) {
        currency_code = country.currencies[0].code;

        // Rule: If currency_code is found...
        if (ratesData[currency_code]) {
          exchange_rate = ratesData[currency_code];

          // Calculate GDP
          const randomMultiplier = Math.random() * (2000 - 1000) + 1000;
          
          // Using the formula from IMG-20251028-WA0001.jpg (division)
          estimated_gdp = (country.population * randomMultiplier) / exchange_rate;

        }
        // Rules for currency_code not in rates API are covered
        // by exchange_rate remaining null and estimated_gdp remaining 0
      }
      // Rules for empty currencies array are covered by defaults

      // Prepare data for upsert
      const countryData = {
        capital: country.capital,
        region: country.region,
        population: country.population,
        currency_code: currency_code,
        exchange_rate: exchange_rate,
        estimated_gdp: estimated_gdp,
        flag_url: country.flag,
      };

      // Upsert logic: Match existing countries by name (case-insensitive)
      const existingCountry = await tx.country.findFirst({
        where: { name: { equals: country.name, mode: 'insensitive' } }
      });

      if (existingCountry) {
        // Update
        await tx.country.update({
          where: { id: existingCountry.id },
          data: countryData,
        });
      } else {
        // Insert
        await tx.country.create({
          data: {
            ...countryData,
            name: country.name, // Use the name from the API
          },
        });
      }
    }

    // After loop, update the global status
    const totalCountries = await tx.country.count();

    await tx.apiStatus.upsert({
      where: { id: 1 },
      update: {
        total_countries: totalCountries,
        last_refreshed_at: refreshTime,
      },
      create: {
        id: 1,
        total_countries: totalCountries,
        last_refreshed_at: refreshTime,
      },
    });
  });

  // After transaction succeeds, generate the image
  await generateSummaryImage();
};

/**
 * Main service for GET /countries
 */
const fetchAllCountries = async ({ region, sort }) => {
  const queryOptions = {
    where: {},
    orderBy: {},
  };

  if (region) {
    queryOptions.where.region = { equals: region, mode: 'insensitive' };
  }

  if (sort === 'gdp_desc') {
    queryOptions.orderBy.estimated_gdp = 'desc';
  }

  return await prisma.country.findMany(queryOptions);
};

/**
 * Main service for GET /countries/:name
 */
const fetchCountryByName = async (name) => {
  return await prisma.country.findFirst({
    where: { name: { equals: name, mode: 'insensitive' } },
  });
};

/**
 * Main service for DELETE /countries/:name
 */
const deleteCountry = async (name) => {
  // Find first to get the ID for a case-insensitive match
  const country = await fetchCountryByName(name);
  
  if (!country) {
    // Throw an error that Prisma client understands as "record not found"
    throw new Error('P2025');
  }

  // Delete by the specific ID
  return await prisma.country.delete({
    where: { id: country.id },
  });
};

/**
 * Main service for GET /status
 */
const fetchStatus = async () => {
  const status = await prisma.apiStatus.findUnique({ where: { id: 1 } });
  if (!status) {
    // Return empty state if /refresh has never been run
    return { total_countries: 0, last_refreshed_at: null };
  }
  return status;
};

/**
 * Main service for GET /countries/image
 */
const fetchImagePath = () => {
  // Check if file exists. Throws error if not.
  fs.accessSync(imagePath, fs.constants.F_OK);
  // Return the absolute path
  return path.resolve(imagePath);
};


module.exports = {
  refreshData,
  fetchAllCountries,
  fetchCountryByName,
  deleteCountry,
  fetchStatus,
  fetchImagePath,
  ExternalApiError, // Export custom error
};