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
    // Query from most specific to least — Mapbox returns the best match
    // across all requested types, so we get neighborhood if available,
    // otherwise locality, place (city), or district.
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=neighborhood,locality,place,district&language=fr&access_token=${token}`;
    const res = await fetch(url, { next: { revalidate: 86400 } });
    const json = await res.json();

    // Use `text` (short name like "Tevragh-Zeina") not `place_name`
    // (which appends the full hierarchy "Tevragh-Zeina, Nouakchott, Mauritanie")
    const neighborhood: string | null =
      json.features?.[0]?.text ?? null;

    return NextResponse.json({ neighborhood });
  } catch {
    return NextResponse.json({ neighborhood: null });
  }
}
