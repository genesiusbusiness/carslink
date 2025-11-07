const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const files = execSync('find src -type f \\( -name "*.tsx" -o -name "*.ts" \\)', { encoding: 'utf-8' })
  .trim()
  .split('\n')
  .filter(Boolean);

console.log(`Scanning ${files.length} files for syntax errors...`);

files.forEach(file => {
  try {
    let content = fs.readFileSync(file, 'utf-8');
    const originalContent = content;
    const lines = content.split('\n');
    const newLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const nextLine = lines[i + 1];
      
      // Fix: incomplete toast objects
      if (line.match(/toast\(\s*\{/) && nextLine && nextLine.match(/^\s*title:\s*"[\w\s]+",?\s*$/) && lines[i + 2] && lines[i + 2].match(/^\s*return\s*$/)) {
        const titleMatch = nextLine.match(/title:\s*"([^"]+)"/);
        if (titleMatch) {
          newLines.push(line);
          newLines.push(nextLine);
          newLines.push(lines[i + 3]?.match(/^\s*description:/) ? lines[i + 3] : `        description: "",`);
          newLines.push(`        variant: "destructive",`);
          newLines.push(`      })`);
          i += 2; // Skip the return line
          continue;
        }
      }
      
      // Fix: incomplete insert objects
      if (line.match(/\{\s*$/) && nextLine && nextLine.match(/^\s*\w+_id:\s*\w+\.id,?\s*$/) && lines[i + 2] && lines[i + 2].match(/^\s*\.select\(/)) {
        // This looks like an incomplete insert that needs closing
        newLines.push(line);
        i++;
        continue;
      }
      
      newLines.push(line);
    }
    
    // Fix: incomplete interface definitions
    content = newLines.join('\n');
    
    // Fix: incomplete objects in function calls
    content = content.replace(/(\w+)\(\s*\{\s*title:\s*"([^"]+)",?\s*\n\s*return\s*)/g, (match, func, title) => {
      return `${func}({
        title: "${title}",
        description: "",
        variant: "destructive",
      })
      return`;
    });
    
    if (content !== originalContent) {
      fs.writeFileSync(file, content, 'utf-8');
      console.log(`Fixed ${file}`);
    }
  } catch (error) {
    console.error(`Error processing ${file}:`, error.message);
  }
});

console.log('Done!');
