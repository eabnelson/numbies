import fs from 'node:fs'
import path from 'node:path'

const ogMetaTags = `
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.ico" />
    <title>Numbies</title>
    <meta name="description" content="A better payments app" />
    <meta property="og:title" content="Numbies" />
    <meta property="og:description" content="A better payments app" />
    <meta property="og:image" content="https://numbies.xyz/og-image.png" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:type" content="image/png" />
    <meta property="og:url" content="https://numbies.xyz" />
    <meta property="og:type" content="website" />
`

const htmlPaths = [
  path.resolve(process.cwd(), '.vercel/output/static/index.html'),
]

for (const htmlPath of htmlPaths) {
  if (fs.existsSync(htmlPath)) {
    let html = fs.readFileSync(htmlPath, 'utf-8')
    if (!html.includes('og:title')) {
      html = html.replace('<head>', `<head>${ogMetaTags}`)
      fs.writeFileSync(htmlPath, html)
      console.log(`[og-meta] Injected OG tags into ${htmlPath}`)
    } else {
      console.log(`[og-meta] OG tags already present in ${htmlPath}`)
    }
  } else {
    console.log(`[og-meta] File not found: ${htmlPath}`)
  }
}
