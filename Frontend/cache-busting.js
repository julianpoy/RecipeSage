const fs = require('fs');
const path = require('path');
const revHash = require('rev-hash');

const manifestJSON = require('./build-manifest.json');

const wwwDir = path.resolve(__dirname, 'www');
const buildDir = path.resolve(wwwDir, 'build');
const indexPath = path.join(wwwDir, 'index.html');

const hashedRegex = new RegExp('.+\.[a-f0-9]{10}\..+');
const ignoreFiles = [];

fs.readdirSync(buildDir).forEach(file => {

  if (!hashedRegex.test(file) && !ignoreFiles.includes(file)) {
	  const filePath = path.join(buildDir, file);
	  const fileHash = revHash(fs.readFileSync(filePath));

	  const lastDotPos = file.lastIndexOf('.');

	  const newFileName = `${file.substring(0, lastDotPos)}.${fileHash}${file.substring(lastDotPos)}`;
	  const newFilePath = path.join(buildDir, newFileName);
	  fs.renameSync(filePath, newFilePath);
	  manifestJSON[file] = `build/${newFileName}`;
  }

});

let indexContent = fs.readFileSync(indexPath).toString('utf8');

Object.keys(manifestJSON).forEach(key => {
	indexContent = indexContent.replace(`build/${key}`, manifestJSON[key]);
});

fs.writeFileSync(indexPath, indexContent);
fs.unlinkSync('./build-manifest.json');
