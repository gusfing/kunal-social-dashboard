// API route for posting to social platforms
// Uses GitHub Gist as a queue

const GIST_ID = process.env.GIST_ID || 'ad437d0ac4f6ea8aa953c6cbdf1c66a7';
const GIST_URL = `https://api.github.com/gists/${GIST_ID`;

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

export default async function handler(req, res) {
  // GET - return queue OR alarm
  if (req.method === 'GET') {
    try {
      const gist = await getGist();
      const queue = JSON.parse(gist.files['queue.json'].content);
      // Return alarm if requested
      const url = new URL(req.url, 'http://x');
      if (url.searchParams.get('alarm') === '1') {
        res.status(200).json({ alarm: queue.alarm || null });
        return;
      }
      res.status(200).json(queue);
    } catch (error) {
      console.error('GET Error:', error);
      res.status(500).json({ error: error.message, posts: [] });
    }
    return;
  }

  // DELETE - remove post from queue OR clear alarm
  if (req.method === 'DELETE') {
    const { searchParams } = new URL(req.url);
    const postId = searchParams.get('id');
    const clearAlarm = searchParams.get('alarm');
    
    // Clear alarm
    if (clearAlarm === '1') {
      try {
        const gist = await getGist();
        const queue = JSON.parse(gist.files['queue.json'].content);
        queue.alarm = null;
        queue.lastUpdate = new Date().toISOString();
        await updateGist(queue);
        res.status(200).json({ success: true, alarm: null });
      } catch (error) {
        console.error('DELETE Alarm Error:', error);
        res.status(500).json({ error: error.message });
      }
      return;
    }
    
    if (!postId) {
      res.status(400).json({ error: 'Post ID required' });
      return;
    }
    
    try {
      const gist = await getGist();
      const queue = JSON.parse(gist.files['queue.json'].content);
      queue.posts = queue.posts.filter(p => p.id !== postId);
      queue.lastUpdate = new Date().toISOString();
      await updateGist(queue);
      res.status(200).json({ success: true });
    } catch (error) {
      console.error('DELETE Error:', error);
      res.status(500).json({ error: error.message });
    }
    return;
  }

  // POST - add post to queue OR set alarm
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { platform, account, text, images, status, scheduledAt, alarmTime } = req.body;

    // Handle alarm set/clear
    if (alarmTime !== undefined) {
      const gist = await getGist();
      const queue = JSON.parse(gist.files['queue.json'].content);
      queue.alarm = alarmTime ? new Date(alarmTime).toISOString() : null;
      queue.lastUpdate = new Date().toISOString();
      await updateGist(queue);
      console.log(`⏰ Alarm set: ${queue.alarm}`);
      res.status(200).json({ success: true, alarm: queue.alarm });
      return;
    }

    console.log(`\n📤 New post: ${platform} (${account})`);
    console.log(`   Text: ${text?.substring(0, 50)}...`);
    console.log(`   Status: ${status}`);
    if (scheduledAt) console.log(`   Scheduled: ${scheduledAt}`);

    // Get current queue
    const gist = await getGist();
    const queue = JSON.parse(gist.files['queue.json'].content);

    // Add new post
    const post = {
      id: Date.now().toString(),
      platform,
      account,
      text: text || '',
      images: images || [],
      status: status || 'pending',
      createdAt: new Date().toISOString()
    };
    
    if (scheduledAt) {
      post.scheduledAt = scheduledAt;
    }

    if (!queue.posts) queue.posts = [];
    queue.posts.unshift(post);
    queue.lastUpdate = new Date().toISOString();

    await updateGist(queue);

    console.log(`✅ Post added: ${post.id} (${post.status})`);

    res.status(200).json({ 
      success: true, 
      message: status === 'scheduled' ? 'Post scheduled!' : 'Post added to queue!',
      postId: post.id
    });

  } catch (error) {
    console.error('POST Error:', error);
    res.status(500).json({ error: error.message });
  }
}
