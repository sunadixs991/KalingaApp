const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyAb0G2sHWj3AMqNY-zUMj5pZP6AwtjHo2c';

export async function getGeminiResponse(prompt) {
  try {
    const response = await fetch(GEMINI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    console.log('Gemini API response:', data);
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not respond.';
  } catch (e) {
    return 'Error connecting to Gemini.';
  }
}