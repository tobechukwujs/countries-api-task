const services = require('./services');

// POST /countries/refresh
const refreshCountries = async (req, res) => {
  try {
    await services.refreshData();
    res.status(200).json({ message: "Data refreshed successfully" });
  } catch (error) {
    if (error.name === 'ExternalApiError') {
      res.status(503).json({ 
        error: "External data source unavailable", 
        details: error.message 
      });
    } else {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

// GET /countries
const getCountries = async (req, res) => {
  try {
    const { region, sort } = req.query;
    const countries = await services.fetchAllCountries({ region, sort });
    res.status(200).json(countries);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /countries/:name
const getCountryByName = async (req, res) => {
  try {
    const { name } = req.params;
    const country = await services.fetchCountryByName(name);
    
    if (!country) {
      return res.status(404).json({ error: "Country not found" });
    }
    
    res.status(200).json(country);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// DELETE /countries/:name
const deleteCountryByName = async (req, res) => {
  try {
    const { name } = req.params;
    await services.deleteCountry(name);
    res.status(200).json({ message: "Country deleted successfully" });
  } catch (error) {
    // P2025 is Prisma's code for "Record to delete not found"
    if (error.message === 'P2025' || error.code === 'P2025') {
      res.status(404).json({ error: "Country not found" });
    } else {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

// GET /status
const getStatus = async (req, res) => {
  try {
    const status = await services.fetchStatus();
    res.status(200).json(status);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};

// GET /countries/image
const getSummaryImage = (req, res) => {
  try {
    const absolutePath = services.fetchImagePath();
    res.sendFile(absolutePath);
  } catch (error) {
    // If fs.accessSync fails, it throws an error (often code ENOENT)
    if (error.code === 'ENOENT') {
      res.status(404).json({ error: "Summary image not found" });
    } else {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
};

module.exports = {
  refreshCountries,
  getCountries,
  getCountryByName,
  deleteCountryByName,
  getStatus,
  getSummaryImage,
};