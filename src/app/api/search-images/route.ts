import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const seed = searchParams.get("seed") || Math.floor(Math.random() * 10000).toString();

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  try {
    const prompt = `clean simple illustration of ${query}, white background, minimal style, flashcard style, no text, no words, centered, high quality`;

    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&seed=${seed}&nologo=true`;

    return NextResponse.json({
      images: [
        {
          id: 1,
          url: imageUrl,
          preview: imageUrl,
          alt: query,
        },
      ],
    });
  } catch (error) {
    console.error("Image generation error:", error);
    return NextResponse.json({ error: "Failed to generate image" }, { status: 500 });
  }
}
