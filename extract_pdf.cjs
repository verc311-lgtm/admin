const fs = require('fs');
const pdf = require('pdf-parse');

const files = ['Breackdown Projects.pdf', 'Lista Costos.pdf'];

async function extractText() {
    let combinedText = '';
    for (const file of files) {
        if (fs.existsSync(file)) {
            console.log(`Reading ${file}...`);
            const dataBuffer = fs.readFileSync(file);
            try {
                const data = await pdf(dataBuffer);
                combinedText += `\n--- START ${file} ---\n`;
                combinedText += data.text;
                combinedText += `\n--- END ${file} ---\n`;
            } catch (e) {
                console.error(`Error parsing ${file}:`, e);
            }
        } else {
            console.error(`File not found: ${file}`);
        }
    }
    fs.writeFileSync('extracted_pricing.txt', combinedText);
    console.log('Extraction complete. Saved to extracted_pricing.txt');
}

extractText();
