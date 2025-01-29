export const config = {
  runtime: 'nodejs',
  maxDuration: 60, // Maximum execution time in seconds
};
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

  const pageSize = 100, maxPages = 50;
  let page = 1, nextPage = null, hasMore = true, results = [];

  try {
    do {
      if (pageCount >= maxPages) break;
      const params = { page_size: pageSize };
      if (nextPage) params.page = nextPage;

      const response = await axios.get('https://requestquote.w3apps.co/api/v1/quotes', {
        params,
        headers: { 'x-api-key': process.env.API_KEY },
        timeout: 5000,
      });

      const { data, status } = response;
      if (status !== 200 || !Array.isArray(data.data)) throw new Error('API response error.');

      results.push(...data.data.filter(q => q.email?.toLowerCase() === email.toLowerCase()));
      nextPage = data.next_page;
      pageCount++;
    } while (nextPage && pageCount < maxPages);

    res.status(200).json({ Data: results });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      res.status(error.response.status).json({ error: error.response.data });
    } else if (error.request) {
      res.status(503).json({ error: 'API no response.' });
    } else {
      res.status(500).json({ error: 'Server error.' });
    }
  }
};
