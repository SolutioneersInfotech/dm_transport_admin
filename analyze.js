const fs = require('fs');
const path = require('path');

// Read the file
const filePath = path.join(__dirname, 'src', 'components', 'Notifications.jsx');
const fileContent = fs.readFileSync(filePath, 'utf-8');

// Try to parse with acorn if available
try {
  const acorn = require('acorn');
  const jsxPlugin = require('acorn-jsx');
  
  const parser = acorn.Parser.extend(jsxPlugin());
  try {
    parser.parse(fileContent, {
      ecmaVersion: 2020,
      sourceType: 'module',
      locations: true
    });
    console.log('✓ No syntax errors found');
  } catch (syntaxError) {
    console.log('✗ Syntax Error Found:');
    console.log(  Line , Column );
    console.log(  Error: );
  }
} catch (e) {
  console.log('Acorn not available, using basic regex parsing...');
}

// Extract all imports/requires
const importRegex = /(?:import|require)\s*(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)?.*?(?:from|=)\s*['"](.*?)['"];?/g;
const imports = [];
let match;

while ((match = importRegex.exec(fileContent)) !== null) {
  imports.push(match[0]);
}

console.log('\nImports found:');
imports.forEach((imp, idx) => {
  console.log(  . );
});

// Check for common issues
console.log('\nCommon Issues Check:');
const hasUnclosedJSX = (fileContent.match(/<[A-Z]\w*/g) || []).length > (fileContent.match(/<\/[A-Z]\w*>/g) || []).length;
if (hasUnclosedJSX) console.log('  ⚠ Potential unclosed JSX tags');

const hasUnbalancedBraces = (fileContent.match(/{/g) || []).length !== (fileContent.match(/}/g) || []).length;
if (hasUnbalancedBraces) console.log('  ⚠ Potentially unbalanced braces');

const hasUnbalancedParens = (fileContent.match(/\(/g) || []).length !== (fileContent.match(/\)/g) || []).length;
if (hasUnbalancedParens) console.log('  ⚠ Potentially unbalanced parentheses');

console.log('\nFile size: ' + fileContent.length + ' characters');
console.log('Line count: ' + fileContent.split('\n').length);
