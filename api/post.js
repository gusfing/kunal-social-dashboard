// API route for posting to social platforms
// Uses GitHub Gist as a queue

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

export default async function handler(req, res) {
  // GET - return queue
  if (req.method === 'GET') {
    try {
      const gist = await getGist();
      const queue = JSON.parse(gist.files['queue.json'].content);
      res.status(200).json(queue);
    } catch (error) {
      console.error('GET Error:', error);
      res.status(500).json({ error: error.message, posts: [] });
    }
    return;
  }

  // POST - add post to queue
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { platform, text, images } = req.body;

    console.log(`\n📤 New post: ${platform}`);
    console.log(`   Text: ${text?.substring(0, 50)}...`);
    console.log(`   Images: ${images?.length || 0}`);

    // Get current queue
    const gist = await getGist();
    const queue = JSON.parse(gist.files['queue.json'].content);

    // Add new post
    const post = {
      id: Date.now().toString(),
      platform,
      text: text || '',
      images: images || [],
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    if (!queue.posts) queue.posts = [];
    queue.posts.unshift(post);
    queue.lastUpdate = new Date().toISOString();

    await updateGist(queue);

    console.log(`✅ Post added: ${post.id}`);

    res.status(200).json({ 
      success: true, 
      message: 'Post added to queue!',
      postId: post.id
    });

  } catch (error) {
    console.error('POST Error:', error);
    res.status(500).json({ error: error.message });
  }
}
