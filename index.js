const express = require('express');
const dotenv = require('dotenv');
const apiRoutes = require('./src/routes');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json());

// API Routes
app.use('/', apiRoutes);

// Global Error Handler (for unhandled errors)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});