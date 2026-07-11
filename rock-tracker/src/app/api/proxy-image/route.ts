import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) return new NextResponse("Missing url parameter", { status: 400 });

  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch image from remote server");
    
    const buffer = await res.arrayBuffer();
    
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000'
      }
    });
  } catch (error) {
    console.error("Proxy image error:", error);
    return new NextResponse("Failed to proxy image", { status: 500 });
  }
}
