import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 });
  }

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return NextResponse.json({ neighborhood: null });
  }

  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,locality&access_token=${token}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const json = await res.json();

    const neighborhood: string | null =
      json.features?.[0]?.place_name ?? null;

    return NextResponse.json({ neighborhood });
  } catch {
    return NextResponse.json({ neighborhood: null });
  }
}
