// api/search-quotes.js

const axios = require('axios');
const validator = require('validator');

module.exports = async (req, res) => {
  const allowedOrigin = 'https://store.pamperhaus.net';

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Use POST method.' });

  const { email } = req.body;
  if (!email || !validator.isEmail(email)) return res.status(400).json({ error: 'Invalid email.' });

  const pageSize = 100;    // Number of records per request
  const maxPages = 50;     // Maximum number of pages to prevent infinite loops
  let nextPage = null;     // Identifier for the next page
  let pageCount = 0;       // Counter for the number of pages fetched
  const results = [];      // Array to accumulate matching quotes

  try {
    do {
      if (pageCount >= maxPages) break;

      const params = { page_size: pageSize };
      if (nextPage) params.page = nextPage;

      const response = await axios.get('https://requestquote.w3apps.co/api/v1/quotes', {
        params,
        headers: { 'x-api-key': process.env.API_KEY , 'Content-Type': 'application/json; charset=utf-8'},
        timeout: 60000, // 5 seconds timeout
      });

      const { data, status } = response;

      // Validate response status and structure
      if (status !== 200 || !Array.isArray(data.data)) {
        throw new Error('API response error.');
      }

      // Filter quotes by email (case-insensitive)
      const filteredQuotes = data.data.filter(q => 
        q.email && q.email.toLowerCase() === email.toLowerCase()
      );

      // Accumulate matching quotes
      results.push(...filteredQuotes);

      // Update nextPage for the next iteration
      nextPage = data.next_page;
      pageCount++;
    } while (nextPage && pageCount < maxPages);

    // Respond with the accumulated results
    res.status(200).json({ Data: results });
  } catch (error) {
    console.error('Error fetching quotes:', error.message);

    if (error.response) {
      // API responded with a status outside the 2xx range
      res.status(error.response.status).json({ error: error.response.data });
    } else if (error.request) {
      // No response received from API
      res.status(503).json({ error: 'No response from the quotes API.' });
    } else {
      // Other errors
      res.status(500).json({ error: 'Internal Server Error.' });
    }
  }
};
