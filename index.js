const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 8080; // Cloud Run uses port 8080

const searchQuotes = require('./api/search-quotes');

app.use(express.json());

// Define allowed origins
const allowedOrigins = ['https://store.pamperhaus.net/account'];

// CORS Configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

// Use CORS Middleware
app.use(cors(corsOptions));

// Health Check Endpoint
app.get('/', (req, res) => {
  res.send('Quote Search API is running.');
});

// Search Quotes Endpoint
app.post('/api/search-quotes', searchQuotes); // Ensure the path matches

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});