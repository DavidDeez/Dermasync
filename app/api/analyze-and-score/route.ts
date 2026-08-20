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
        "skinType": "Oily, Acne-Prone",
        "concerns": ["Inflammatory Acne", "Excess Sebum"],
        "sensitivity": "High",
        "hydrationLevel": 65
      },
      "safetyScore": 85,
      "isSafe": true,
      "analysis": "A highly personalized, brutally honest clinical analysis...",
      "flaggedIngredients": ["Niacinamide"]
    }
    
    Make your assessment highly personalized. Be clinical.
    CRITICAL INSTRUCTION: Do NOT analyze every single ingredient. Only focus on the top active ingredients and major flags. Keep any internal reasoning extremely brief (under 50 words). Begin your final response with '{'.
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
          { role: 'system', content: 'You are an expert AI dermatologist. You analyze skin profiles and product ingredients to determine safety and compatibility.' },
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API Error: ${errText}`);
    }

    const data = await response.json();
    let textContent = data.choices[0].message.content || '';
    
    // Strip <think> blocks before parsing to prevent stray braces from breaking the depth counter
    textContent = textContent.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '').trim();

    const firstBrace = textContent.indexOf('{');
    if (firstBrace !== -1) {
      let depth = 0;
      for (let i = firstBrace; i < textContent.length; i++) {
        if (textContent[i] === '{') depth++;
        else if (textContent[i] === '}') {
          depth--;
          if (depth === 0) {
            textContent = textContent.substring(firstBrace, i + 1);
            break;
          }
        }
      }
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
