// search-quotes.js

export const config = {
  runtime: 'nodejs',
  maxDuration: 60, // Maximum execution time in seconds
};

import axios from 'axios';
import validator from 'validator';

export default async (req, res) => {
  const allowedOrigin = 'https://store.pamperhaus.net';

  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight (OPTIONS) requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
    return;
  }

  const { email } = req.body;

  // Validate email
  if (!email || !validator.isEmail(email)) {
    res.status(400).json({ error: 'Invalid or missing email format.' });
    return;
  }

  const pageSize = 100;
  const maxPages = 50;
  let nextPage = null;
  let pageCount = 0;
  const results = [];

  try {
    do {
      if (pageCount >= maxPages) break;

      const params = { page_size: pageSize };
      if (nextPage) params.page = nextPage;

      const response = await axios.get('https://requestquote.w3apps.co/api/v1/quotes', {
        params,
        headers: { 'x-api-key': process.env.API_KEY },
        timeout: 5000, // 5 seconds timeout
      });

      const { data, status } = response;

      // Validate response status and structure
      if (status !== 200 || !Array.isArray(data.data)) {
        throw new Error('API response error.');
      }

      // Filter quotes by email (case-insensitive)
      results.push(
        ...data.data.filter(
          (q) => q.email && q.email.toLowerCase() === email.toLowerCase()
        )
      );

      // Update nextPage for the next iteration
      nextPage = data.next_page;
      pageCount++;
    } while (nextPage && pageCount < maxPages);

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
