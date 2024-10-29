const verboseMode = process.env.VERBOSE_MODE === 'true';

function verboseLogger(req, res, next) {
  if (verboseMode) {
    const timestamp = new Date().toISOString();
    const method = req.method;
    const url = req.url;
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.get('User-Agent');

    console.log(`[${timestamp}] ${method} ${url}`);
    console.log(`  IP: ${ip}`);
    console.log(`  User-Agent: ${userAgent}`);
    
    if (Object.keys(req.query).length > 0) {
      console.log('  Query params:', req.query);
    }
    
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('  Body:', JSON.stringify(req.body, null, 2));
    }

    // Capture the original json method
    const originalJson = res.json;

    // Override the json method
    res.json = function(body) {
      // Log the response body
      console.log('  Response:', JSON.stringify(body, null, 2));

      // Call the original json method
      originalJson.call(this, body);
    };

    // Log when the response is finished
    res.on('finish', () => {
      console.log(`  Status: ${res.statusCode}`);
      console.log('---');
    });
  }
  next();
}

module.exports = verboseLogger;