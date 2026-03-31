const APP_URL = 'https://www.0dechets.com';

export async function GET() {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  <url>
    <loc>${APP_URL}/fr</loc>
    <xhtml:link rel="alternate" hreflang="fr" href="${APP_URL}/fr"/>
    <xhtml:link rel="alternate" hreflang="ar" href="${APP_URL}/ar"/>
    <xhtml:link rel="alternate" hreflang="en" href="${APP_URL}/en"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${APP_URL}/fr"/>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${APP_URL}/en</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${APP_URL}/ar</loc>
    <changefreq>hourly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml' },
  });
}
