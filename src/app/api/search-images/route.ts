import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required" }, { status: 400 });
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "PEXELS_API_KEY not configured" }, { status: 500 });
  }

  try {
    const res = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=12&orientation=squarish`,
      {
        headers: {
          Authorization: apiKey,
        },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to fetch images" }, { status: res.status });
    }

    const data = await res.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const images = data.photos.map((photo: any) => ({
      id: photo.id,
      url: photo.src?.medium || photo.src?.small,
      preview: photo.src?.small || photo.src?.tiny,
      alt: photo.alt || query,
      photographer: photo.photographer,
      photographer_url: photo.photographer_url,
    }));

    return NextResponse.json({ images });
  } catch (error) {
    console.error("Image search error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
