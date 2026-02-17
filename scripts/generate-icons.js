import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgPath = path.join(process.cwd(), 'public', 'icon.svg');
const publicDir = path.join(process.cwd(), 'public');

if (!fs.existsSync(svgPath)) {
    console.error('Error: public/icon.svg not found');
    process.exit(1);
}

const sizes = [192, 512];

async function generate() {
    for (const size of sizes) {
        const pngPath = path.join(publicDir, `pwa-${size}x${size}.png`);
        await sharp(svgPath)
            .resize(size, size)
            .png()
            .toFile(pngPath);
        console.log(`Generated ${pngPath}`);
    }
}

generate().catch(console.error);
