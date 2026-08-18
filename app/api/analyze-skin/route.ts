import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      throw new Error("No image provided");
    }

    const prompt = `
    You are an expert, highly clinical AI dermatologist analyzing a patient's selfie.
    Please analyze this image and return a JSON object that strictly matches the following schema:
    {
      "skinType": "String (e.g., 'Combination', 'Oily', 'Dry', 'Normal')",
      "concerns": ["Array of Strings (e.g., 'Mild Acne', 'Redness', 'Hyperpigmentation', 'Dry patches', 'Uneven Texture')"],
      "sensitivity": "String (e.g., 'High', 'Moderate', 'Low')",
      "hydrationLevel": Number (from 0 to 100, estimating current hydration)
    }
    
    CRITICAL INSTRUCTION: Do NOT output any <think> blocks or reasoning. Start your response immediately with the opening curly brace '{'.
    
    Make your assessment highly personalized to what you actually see in the image. Be brutally honest and clinical.
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
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          }
        ],
        max_tokens: 800,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq Vision API Error: ${errText}`);
    }

    const data = await response.json();
    let textContent = data.choices[0].message.content;
    
    // Aggressively strip reasoning block even if it's unclosed
    textContent = textContent.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '');
    
    // Bulletproof JSON extraction
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
    console.error("ANALYZE SKIN ERROR:", error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}
