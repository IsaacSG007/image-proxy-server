const express = require('express');
const cors = require('cors');
const app = express();
const port = process.env.PORT || 3001;

// Enable CORS for all routes
app.use(cors());

// Proxy endpoint to fetch OpenAI images and serve to frontend
app.get('/proxy-image', async (req, res) => {
    const imageUrl = req.query.url;
    
    if (!imageUrl) {
        return res.status(400).json({ error: 'Missing URL parameter' });
    }

    // Validate that the URL is from OpenAI
    try {
        const url = new URL(imageUrl);
        if (!url.hostname.includes('openai.com') && !url.hostname.includes('blob.core.windows.net')) {
            return res.status(400).json({ error: 'Invalid image source' });
        }
    } catch (error) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    try {
        console.log('Proxying image request:', imageUrl);
        
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)'
            }
        });
        
        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ 
                error: `Failed to fetch image: ${response.statusText}` 
            });
        }

        // Get content type from original response
        const contentType = response.headers.get('content-type') || 'image/png';
        
        // Set proper headers
        res.set({
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
            'Access-Control-Allow-Origin': '*'
        });

        // Stream the image data
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
        
    } catch (error) {
        console.error('Proxy image error:', error);
        res.status(500).json({ error: 'Error fetching image' });
    }
});

// New endpoint to download and convert images to base64
app.post('/download-image', async (req, res) => {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
        return res.status(400).json({ error: 'Missing imageUrl in request body' });
    }

    // Validate that the URL is from OpenAI
    try {
        const url = new URL(imageUrl);
        if (!url.hostname.includes('openai.com') && !url.hostname.includes('blob.core.windows.net')) {
            return res.status(400).json({ error: 'Invalid image source' });
        }
    } catch (error) {
        return res.status(400).json({ error: 'Invalid URL format' });
    }

    try {
        console.log('Downloading and converting image to base64:', imageUrl);
        
        const response = await fetch(imageUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (compatible; ImageProxy/1.0)'
            }
        });
        
        if (!response.ok) {
            console.error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            return res.status(response.status).json({ 
                error: `Failed to fetch image: ${response.statusText}` 
            });
        }

        // Get content type and convert to base64
        const contentType = response.headers.get('content-type') || 'image/png';
        const buffer = await response.arrayBuffer();
        const base64 = Buffer.from(buffer).toString('base64');
        const dataUri = `data:${contentType};base64,${base64}`;
        
        console.log('Successfully converted image to base64, size:', buffer.byteLength);
        
        res.json({ 
            success: true, 
            dataUri,
            contentType,
            size: buffer.byteLength
        });
        
    } catch (error) {
        console.error('Download image error:', error);
        res.status(500).json({ error: 'Error downloading and converting image' });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(port, () => {
    console.log(`Image proxy server running on port ${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
});
