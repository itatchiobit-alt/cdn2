export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  try {
    // Build API URL
    const queryString = new URLSearchParams(req.query).toString();
    const apiUrl = `https://lunchverse.free.nf/api.php${queryString ? '?' + queryString : ''}`;
    
    // Prepare request options
    const options = {
      method: req.method,
      headers: {
        'Content-Type': req.headers['content-type'] || 'application/json',
      }
    };
    
    // Forward cookies for session management
    if (req.headers.cookie) {
      options.headers['Cookie'] = req.headers.cookie;
    }
    
    // Add body for POST/PUT/DELETE
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      if (req.headers['content-type']?.includes('multipart/form-data')) {
        // For file uploads, forward raw body
        options.body = req.body;
      } else {
        options.body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      }
    }
    
    // Make request to InfinityFree API
    const response = await fetch(apiUrl, options);
    
    // Forward Set-Cookie headers for session
    const setCookie = response.headers.get('set-cookie');
    if (setCookie) {
      res.setHeader('Set-Cookie', setCookie);
    }
    
    // Get content type
    const contentType = response.headers.get('content-type');
    
    // Handle JSON responses
    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }
    
    // Handle binary/file downloads
    if (contentType && contentType.includes('octet-stream')) {
      const buffer = await response.arrayBuffer();
      const disposition = response.headers.get('content-disposition');
      if (disposition) {
        res.setHeader('Content-Disposition', disposition);
      }
      res.setHeader('Content-Type', 'application/octet-stream');
      return res.status(response.status).send(Buffer.from(buffer));
    }
    
    // Handle text responses
    const text = await response.text();
    return res.status(response.status).send(text);
    
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ 
      error: 'Proxy request failed', 
      message: error.message 
    });
  }
}