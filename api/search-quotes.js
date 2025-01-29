// // api/search-quotes.js

// const axios = require('axios');
// const validator = require('validator');

// module.exports = async (req, res) => {

//   const allowedOrigin = 'https://store.pamperhaus.net';

//   // Set CORS headers for all responses
//   res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
//   res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
//   res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

//   // Handle preflight (OPTIONS) requests
//   if (req.method === 'OPTIONS') {
//     // Respond with 200 OK for preflight requests
//     res.status(200).end();
//     return;
//   }
  
//   // Only allow POST requests
//   if (req.method !== 'POST') {
//     res.status(405).json({ error: 'Method Not Allowed. Use POST.' });
//     return;
//   }

//   const { email } = req.body;

//   // Validate email
//   if (!email || typeof email !== 'string' || !validator.isEmail(email)) {
//     return res.status(400).json({ error: 'Invalid or missing email in request body.' });
//   }

//   try {
//     const searchUrl = 'https://requestquote.w3apps.co/v3/quotes/search/1';
//     const payload = {
//       searchString: email,
//       searchFilters: [],
//       UserID: null
//     };

//     const response = await axios.post(searchUrl, payload, {
//       headers: {
//         'x-api-auth-token': process.env.API_KEY,
//         'Content-Type': 'application/json; charset=utf-8'
//       }
//     });

//     // Check if the response is successful
//     if (response.status !== 200) {
//       return res.status(response.status).json({ error: `API responded with status ${response.status}` });
//     }

//     const data = response.data;

//     // Validate response structure
//     if (!data || !Array.isArray(data.Data)) {
//       return res.status(500).json({ error: 'Unexpected API response structure.' });
//     }

//     // Send the Data array as JSON
//     return res.status(200).json({ Data: data.Data });
//   } catch (error) {
//     console.error('Error fetching quotes:', error.message);

//     // Handle specific error cases
//     if (error.response) {
//       // API responded with a status outside the 2xx range
//       return res.status(error.response.status).json({ error: error.response.data });
//     } else if (error.request) {
//       // No response received from API
//       return res.status(503).json({ error: 'No response from the quotes API.' });
//     } else {
//       // Other errors
//       return res.status(500).json({ error: 'Error in setting up the API request.' });
//     }
//   }
// };

const axios = require('axios');
const validator = require('validator');
const XLSX = require('xlsx');
const dotenv = require('dotenv');

// Load environment variables from .env file (if using dotenv)
dotenv.config();

module.exports = async (req, res) => {
  const allowedOrigin = 'https://store.pamperhaus.net';

  // Set CORS headers for all responses
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

  // Validate the email
  if (!email || !validator.isEmail(email)) {
    res.status(400).json({ error: 'Invalid or missing email in request body.' });
    return;
  }

  try {
    // Step 1: Export Quotes
    const exportUrl = 'https://requestquote.w3apps.co/v3/quotes/export/';
    const exportPayload = {
      Type: "all",
      SearchObj: {
        searchString: "",
        searchFilters: []
      }
    };

    const exportResponse = await axios.post(exportUrl, exportPayload, {
      headers: {
        'x-api-auth-token': 'f4f010-6cea35a0-c6c2-4c84-93ec-501f56edf01d', // process.env.API_KEY,
        'Content-Type': 'application/json; charset=utf-8'
      },
      responseType: 'text' // Specify response type as text
    });

    console.log(exportResponse.data)

    // Check if the export was successful and filename is returned
    if (exportResponse.status !== 200 || !exportResponse.data) {
      return res.status(500).json({ error: 'Failed to export quotes or invalid export response.' });
    }

    const excelFilename = exportResponse.data.trim(); // Extract filename from plain text

    // Validate the filename format (basic check)
    if (!excelFilename.endsWith('.xlsx')) {
      return res.status(500).json({ error: 'Invalid filename format received from export API.' });
    }

    // Step 2: Download the Excel File
    // **Note:** Adjust the download URL based on your API's actual file download endpoint.
    // The following is an assumed pattern. Replace it with the correct one if different.
    const downloadUrl = `https://requestquote.w3apps.co/v3/quotes/export/download/${excelFilename}`;
    
    const excelResponse = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      headers: {
        'x-api-auth-token': 'f4f010-6cea35a0-c6c2-4c84-93ec-501f56edf01d', //process.env.API_KEY
      }
    });

    if (excelResponse.status !== 200) {
      return res.status(excelResponse.status).json({ error: `Failed to download Excel file. Status: ${excelResponse.status}` });
    }

    const excelBuffer = Buffer.from(excelResponse.data, 'binary');

    // Step 3: Parse the Excel File
    const workbook = XLSX.read(excelBuffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0]; // Assuming data is in the first sheet
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

    // Step 4: Filter Data by Email
    const filteredData = jsonData.filter(row => row.Email && row.Email.toLowerCase() === email.toLowerCase());

    // Optional: Check if any data matched
    if (filteredData.length === 0) {
      return res.status(404).json({ message: 'No quotes found for the provided email.' });
    }

    // Step 5: Return the Filtered Data
    return res.status(200).json({ Data: filteredData });

  } catch (error) {
    console.error('Error processing request:', error.message);

    // Handle specific error cases
    if (error.response) {
      // API responded with a status outside the 2xx range
      return res.status(error.response.status).json({ error: error.response.data });
    } else if (error.request) {
      // No response received from API
      return res.status(503).json({ error: 'No response from the quotes API.' });
    } else {
      // Other errors
      return res.status(500).json({ error: 'Error in processing the request.' });
    }
  }
};
