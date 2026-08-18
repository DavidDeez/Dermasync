import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64, productInfo } = await req.json();

    if (!imageBase64) throw new Error("No image provided");
    if (!productInfo) throw new Error("No product info provided");

    const safeProductInfo = typeof productInfo === 'string' ? productInfo : JSON.stringify(productInfo);

    const prompt = `
    You are an expert dermatologist AI. 
    Analyze this patient's selfie AND the following product ingredients:
    
    PRODUCT INFO:
    ${safeProductInfo.slice(0, 1000)}
    
    Provide a SINGLE JSON object that matches this exact schema:
    {
      "skinProfile": {
        "skinType": "String",
        "concerns": ["Array of Strings"],
        "sensitivity": "String",
        "hydrationLevel": Number (0-100)
      },
      "safetyScore": Number (0-100),
      "isSafe": Boolean,
      "analysis": "A short explanation of why it is safe or not for this specific user",
      "flaggedIngredients": ["Array of bad ingredients for this user"]
    }
    
    Make your assessment highly personalized. Be clinical.
    `;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [
          { role: 'system', content: 'You are a pure JSON API. You MUST output ONLY valid JSON. You are STRICTLY FORBIDDEN from using <think> tags or reasoning.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          }
        ],
        max_tokens: 3000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API Error: ${errText}`);
    }

    const data = await response.json();
    let textContent = data.choices[0].message.content;
    
    const firstBrace = textContent.indexOf('{');
    const lastBrace = textContent.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace >= firstBrace) {
      textContent = textContent.substring(firstBrace, lastBrace + 1);
    }
    
    let result;
    try {
      result = JSON.parse(textContent);
    } catch (parseError: any) {
      throw new Error(`JSON Parse Error: ${parseError.message} | Raw Extracted: ${textContent}`);
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("COMBO API ERROR:", error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}
