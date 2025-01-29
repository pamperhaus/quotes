// api/search-quotes.js

const axios = require('axios');
const validator = require('validator');

module.exports = async (req, res) => {

  const allowedOrigin = 'https://store.pamperhaus.net';

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    // Respond with 200 OK for preflight requests
    res.status(200).end();
    return;
  }
  
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  const { email } = req.body;
  
  if (!email || !validator.isEmail(email)) return res.status(400).json({ error: 'Invalid email.' });

  try {
    const searchUrl = 'https://requestquote.w3apps.co/v3/quotes/search/1';
    const payload = {
      searchString: email,
      searchFilters: [],
      UserID: null
    };

    const response = await axios.post(searchUrl, payload, {
      headers: {
        'x-api-auth-token': process.env.API_KEY,
        'Content-Type': 'application/json; charset=utf-8'
      }
    });

    // Check if the response is successful
    if (response.status !== 200) {
      return res.status(response.status).json({ error: `API responded with status ${response.status}` });
    }

    const data = response.data;

    // Validate response structure
    if (!data || !Array.isArray(data.Data)) {
      return res.status(500).json({ error: 'Unexpected API response structure.' });
    }

    // Send the Data array as JSON
    return res.status(200).json({ Data: data.Data });
  } catch (error) {
    console.error('Error fetching quotes:', error.message);

    // Handle specific error cases
    if (error.response) {
      // API responded with a status outside the 2xx range
      return res.status(error.response.status).json({ error: error.response.data });
    } else if (error.request) {
      // No response received from API
      return res.status(503).json({ error: 'No response from the quotes API.' });
    } else {
      // Other errors
      return res.status(500).json({ error: 'Error in setting up the API request.' });
    }
  }
};
