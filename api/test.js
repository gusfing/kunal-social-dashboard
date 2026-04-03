module.exports = async function handler(req, res) {
  res.status(200).json({ 
    success: true, 
    message: 'API working',
    githubToken: process.env.GITHUB_TOKEN ? 'set' : 'NOT SET',
    gistId: process.env.GIST_ID || 'not set'
  });
}
