/**
 * Export utilities for downloading posters as SVG or PNG
 */

/**
 * Serialize SVG to string safely, including external fonts
 */
function getSerializedSVG(svgElement, fontFamily = 'Inter') {
    // Clone the SVG to avoid modifying the original
    const clonedSvg = svgElement.cloneNode(true);

    // Ensure dimensions are set correctly for export
    const viewBox = svgElement.getAttribute('viewBox')?.split(' ') || [0, 0, 600, 800];
    const width = viewBox[2];
    const height = viewBox[3];
    clonedSvg.setAttribute('width', width);
    clonedSvg.setAttribute('height', height);

    // Create a defs element if it doesn't exist, or use the existing one
    let defs = clonedSvg.querySelector('defs');
    if (!defs) {
        defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        clonedSvg.prepend(defs);
    }

    // Embed all fonts used in the app so they appear in PNG/SVG export
    const style = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    style.setAttribute('type', 'text/css');

    // We force the chosen fontFamily on all text elements to ensure cross-viewer compatibility
    style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Montserrat:wght@300;400;500;600;700&family=Courier+Prime:wght@400;700&family=Outfit:wght@300;400;500;600;700&family=Nunito:wght@200..900&display=swap');
        
        text, tspan {
            font-family: ${fontFamily}, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
        }
    `;
    defs.appendChild(style);

    // Add XML namespace if not present
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');

    // Serialize the SVG
    const serializer = new XMLSerializer();
    return serializer.serializeToString(clonedSvg);
}

/**
 * Export SVG element as a downloadable file
 */
export function exportSVG(svgElement, filename, fontFamily) {
    if (!svgElement) {
        console.error('No SVG element provided for export');
        return;
    }

    try {
        const svgString = getSerializedSVG(svgElement, fontFamily);
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.svg`;

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log(`SVG exported successfully: ${filename}.svg`);
    } catch (error) {
        console.error('Failed to export SVG:', error);
        throw error;
    }
}

/**
 * Export SVG element as a high-resolution PNG using native Canvas
 * 
 * Avoids html2canvas overhead which often leads to "Invalid string length" errors
 * when dealing with complex SVGs.
 */
export async function exportPNG(svgElement, filename, fontFamily, scale = 3) {
    if (!svgElement) {
        console.error('No SVG element provided for export');
        return;
    }

    return new Promise((resolve, reject) => {
        try {
            const svgString = getSerializedSVG(svgElement, fontFamily);
            const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });

            const viewBox = svgElement.getAttribute('viewBox')?.split(' ') || [0, 0, 600, 800];
            const width = parseFloat(viewBox[2]);
            const height = parseFloat(viewBox[3]);

            const canvas = document.createElement('canvas');
            canvas.width = width * scale;
            canvas.height = height * scale;
            const ctx = canvas.getContext('2d');

            // Enable high quality image scaling
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            const img = new Image();
            const url = URL.createObjectURL(blob);

            img.onload = () => {
                try {
                    // Draw to canvas with scaling
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

                    canvas.toBlob((pngBlob) => {
                        if (!pngBlob) {
                            reject(new Error('Failed to generate PNG blob'));
                            return;
                        }

                        const pngUrl = URL.createObjectURL(pngBlob);
                        const link = document.createElement('a');
                        link.href = pngUrl;
                        link.download = `${filename}.png`;

                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);

                        // Cleanup
                        URL.revokeObjectURL(pngUrl);
                        URL.revokeObjectURL(url);
                        resolve();
                    }, 'image/png');
                } catch (err) {
                    reject(err);
                }
            };

            img.onerror = (err) => {
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load SVG into image for PNG conversion'));
            };

            img.src = url;
        } catch (error) {
            console.error('Failed to export PNG:', error);
            reject(error);
        }
    });
}

/**
 * Generate filename from city and theme
 */
export function generateFilename(city, theme) {
    const citySlug = city.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const themeSlug = theme.toLowerCase().replace(/\s+/g, '_');
    return `${citySlug}_${themeSlug}_poster`;
}
