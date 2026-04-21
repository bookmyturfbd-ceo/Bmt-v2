const fs = require('fs');

try {
  const fPath = 'src/app/[locale]/teams/[id]/page.tsx';
  let c = fs.readFileSync(fPath, 'utf8');

  // Left Banner
  const oldLeftBanner = `className="w-full h-80 backdrop-blur-md flex flex-col items-center justify-start pt-8 pb-10 shadow-2xl relative"
            >
              <div `;
              
  const newLeftBanner = `className="w-full h-80 backdrop-blur-md flex flex-col items-center justify-start pt-8 pb-10 shadow-2xl relative overflow-hidden group"
            >
              {/* Dynamic Banner Background colourized by the parent background mask through blend modes */}
              <img src="/banners/Banner%2001.svg" className="absolute top-0 left-0 w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:scale-105 transition-transform duration-700 pointer-events-none" alt="" />
              <div `;
              
  c = c.replace(oldLeftBanner, newLeftBanner);

  // Right Banner
  const oldRightBanner = `className="w-full h-80 bg-gradient-to-b from-amber-700/80 via-neutral-900/40 via-60% to-neutral-900/90 backdrop-blur-md flex flex-col items-center justify-start pt-8 pb-10 shadow-2xl relative"
            >
              <div `;
              
  const newRightBanner = `className="w-full h-80 bg-gradient-to-b from-amber-700/80 via-neutral-900/40 via-60% to-neutral-900/90 backdrop-blur-md flex flex-col items-center justify-start pt-8 pb-10 shadow-2xl relative overflow-hidden group"
            >
              <img src="/banners/Banner%2001.svg" className="absolute top-0 left-0 w-full h-full object-cover mix-blend-overlay opacity-60 group-hover:scale-105 transition-transform duration-700 pointer-events-none" alt="" />
              <div `;
              
  c = c.replace(oldRightBanner, newRightBanner);

  fs.writeFileSync(fPath, c, 'utf8');
  console.log('Successfully injected SVG Banner with mix-blend-overlay coloring!');
} catch (e) {
  console.error(e);
}
