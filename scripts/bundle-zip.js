import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';

const zip = new JSZip();

function addFolder(folderPath, zipFolder) {
  if (!fs.existsSync(folderPath)) return;
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    if (file === 'redmode-build.zip') continue;
    const fullPath = path.join(folderPath, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      addFolder(fullPath, zipFolder.folder(file));
    } else {
      zipFolder.file(file, fs.readFileSync(fullPath));
    }
  }
}

addFolder('dist', zip);

zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
  .then(buf => {
    fs.writeFileSync('public/redmode-build.zip', buf);
    if (fs.existsSync('dist')) {
      fs.writeFileSync('dist/redmode-build.zip', buf);
    }
    console.log(`[ZIP SUCCESS] redmode-build.zip created: ${(buf.length / 1024 / 1024).toFixed(2)} MB`);
  })
  .catch(err => {
    console.error('Error generating build zip:', err);
    process.exit(1);
  });
