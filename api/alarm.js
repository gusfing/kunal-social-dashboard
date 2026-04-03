// API route for alarm - CommonJS format
const GIST_ID = process.env.GIST_ID || 'ad437d0ac4f6ea8aa953c6cbdf1c66a7';
const GIST_URL = `https://api.github.com/gists/${GIST_ID}`;

async function getGist() {
  const res = await fetch(GIST_URL, {
    headers: { 
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });
  if (!res.ok) throw new Error('Failed to fetch Gist');
  return res.json();
}

async function updateGist(content) {
  const res = await fetch(GIST_URL, {
    method: 'PATCH',
    headers: {
      'Authorization': `token ${process.env.GITHUB_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      files: {
        'queue.json': {
          content: JSON.stringify(content, null, 2)
        }
      }
    })
  });
  if (!res.ok) throw new Error('Failed to update Gist');
}

module.exports = async function handler(req, res) {
  // GET - return alarm
  if (req.method === 'GET') {
    try {
      const gist = await getGist();
      const data = JSON.parse(gist.files['queue.json'].content);
      res.status(200).json({ alarm: data.alarm || null });
    } catch (error) {
      console.error('GET Error:', error);
      res.status(500).json({ error: error.message, alarm: null });
    }
    return;
  }

  // POST - set alarm
  if (req.method === 'POST') {
    try {
      const { alarmTime } = req.body;
      const gist = await getGist();
      const data = JSON.parse(gist.files['queue.json'].content);
      data.alarm = alarmTime ? new Date(alarmTime).toISOString() : null;
      await updateGist(data);
      res.status(200).json({ success: true, alarm: data.alarm });
    } catch (error) {
      console.error('POST Error:', error);
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // DELETE - clear alarm
  if (req.method === 'DELETE') {
    try {
      const gist = await getGist();
      const data = JSON.parse(gist.files['queue.json'].content);
      data.alarm = null;
      await updateGist(data);
      res.status(200).json({ success: true, alarm: null });
    } catch (error) {
      console.error('DELETE Error:', error);
      res.status(500).json({ error: error.message });
    }
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
