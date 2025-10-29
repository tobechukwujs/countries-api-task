const express = require('express');
const controller = require('./controllers');
const router = express.Router();

// Endpoints from the spec

// POST /countries/refresh
router.post('/countries/refresh', controller.refreshCountries);

// GET /countries
router.get('/countries', controller.getCountries);

// GET /countries/image
router.get('/countries/image', controller.getSummaryImage);

// GET /countries/:name
router.get('/countries/:name', controller.getCountryByName);

// DELETE /countries/:name
router.delete('/countries/:name', controller.deleteCountryByName);

// GET /status
router.get('/status', controller.getStatus);

module.exports = router;