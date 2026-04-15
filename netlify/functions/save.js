exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }
  try {
    const body = JSON.parse(event.body);
    const { filename, content, images, scriptUrl, folderId } = body;
    
    console.log('Images received:', images ? images.length : 0);
    console.log('Payload size KB:', Math.round(event.body.length / 1024));
    
    const url = scriptUrl || process.env.GOOGLE_SCRIPT_URL;
    
    // Netlify function body limit is 6MB - check size
    const payloadSize = event.body.length;
    console.log('Payload bytes:', payloadSize);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        filename, 
        content, 
        images: images || [], 
        folderId: folderId || '' 
      })
    });
    
    const resultText = await response.text();
    console.log('Google Script response:', resultText.substring(0, 200));
    
    let docUrl = '';
    try { docUrl = JSON.parse(resultText).url || ''; } catch(e) {}
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ success: true, docUrl, imagesCount: (images||[]).length })
    };
  } catch (err) {
    console.error('Save error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
