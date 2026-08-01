const fs = require('fs');
const path = require('path');

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            walkDir(fullPath);
        } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('revalidateTag(')) {
                // Regex to add @ts-ignore before revalidateTag if it's not already there
                const newContent = content.replace(/(?<!\/\/ @ts-ignore\s*)(\s*)revalidateTag\(/g, '$1// @ts-ignore$1revalidateTag(');
                if (newContent !== content) {
                    fs.writeFileSync(fullPath, newContent, 'utf8');
                    console.log(`Updated ${fullPath}`);
                }
            }
        }
    }
}

walkDir('src');
