const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const frontendDir = path.join(__dirname, '../frontend');
const backendPublic = path.join(__dirname, 'public');

console.log('1. Building frontend...');
execSync('npm run build', { cwd: frontendDir, stdio: 'inherit' });

console.log('2. Removing old public folder...');
if (fs.existsSync(backendPublic)) {
    fs.rmSync(backendPublic, { recursive: true, force: true });
}

console.log('3. Copying dist to public...');
const distDir = path.join(frontendDir, 'dist');
fs.cpSync(distDir, backendPublic, { recursive: true });

console.log('Done! POS is ready for production. Start the backend to serve the entire application.');
