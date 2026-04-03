// API route for timer/reminder
module.exports = async function handler(req, res) {
  // Simple test endpoint
  res.status(200).json({ 
    success: true, 
    message: 'Timer API working',
    time: new Date().toISOString()
  });
};
