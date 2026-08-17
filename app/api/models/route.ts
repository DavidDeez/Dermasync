import { NextResponse } from 'next/server';

export async function GET() {
  const response = await fetch('https://api.groq.com/openai/v1/models', {
    headers: {
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
    }
  });
  const data = await response.json();
  return NextResponse.json(data);
}
