import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { skinProfile, productInfo } = await req.json();
    
    const safeProductInfo = typeof productInfo === 'string' ? productInfo : JSON.stringify(productInfo);
    
    const prompt = `
    You are an expert dermatologist AI. 
    Analyze the following product ingredients and claims:
    ${safeProductInfo.slice(0, 6000)}
    
    Against the following user skin profile:
    ${JSON.stringify(skinProfile)}
    
    Provide a JSON response with:
    1. "safetyScore": (number 0-100)
    2. "isSafe": (boolean)
    3. "analysis": (A short explanation of why it is safe or not)
    4. "flaggedIngredients": (An array of strings for any bad ingredients)
    `;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.6-27b',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 800,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Groq API Error: ${errText}`);
    }

    const data = await response.json();
    let textContent = data.choices[0].message.content;
    
    // Aggressively strip reasoning block even if it's unclosed
    textContent = textContent.replace(/<think>[\s\S]*?(<\/think>|$)/gi, '');
    
    // Bulletproof JSON extraction: extract everything between the first { and last }
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
    console.error("GENERATE SCORE ERROR:", error);
    return NextResponse.json({ error: error.message || 'Error' }, { status: 500 });
  }
}
