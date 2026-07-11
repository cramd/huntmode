import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) {
      return NextResponse.json({ error: "Missing image URL" }, { status: 400 });
    }

    // Convert data URL to base64 for Vercel AI SDK if needed, else parse as URL
    let imagePart;
    if (imageUrl.startsWith('data:image')) {
      const base64Data = imageUrl.split(',')[1];
      imagePart = Buffer.from(base64Data, 'base64');
    } else {
      try {
        imagePart = new URL(imageUrl);
      } catch (e) {
        // If it's a local mock like /placeholder-rock.jpg
        return NextResponse.json({ analysis: "<b>AI Geologist says:</b><p>This appears to be a placeholder image! Snap a real photo to let me analyze its mineral properties and hardness.</p>" });
      }
    }

    const { text } = await generateText({
      model: google('gemini-1.5-flash'),
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'You are an expert geologist and mineralogist. Analyze this image of a rock. Provide a brief, fascinating identification. Format your response in simple HTML (using <b>, <p>, <ul>) to highlight key characteristics like Hardness, Probable Minerals, and a Fun Fact. Do NOT use markdown code blocks, just return raw HTML.' },
            { type: 'image', image: imagePart },
          ],
        },
      ],
    });

    return NextResponse.json({ analysis: text });
  } catch (error) {
    console.error("AI Analysis error:", error);
    return NextResponse.json({ error: "Failed to analyze rock" }, { status: 500 });
  }
}
