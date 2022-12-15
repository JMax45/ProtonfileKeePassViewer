const JSZip = require('jszip');
const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile);
const copyFileAsync = promisify(fs.copyFile);
const existsAsync = promisify(fs.exists);
const kdbxweb = require('kdbxweb');

(async () => {
  const data = await readFileAsync('package.json');
  const package = JSON.parse(data.toString());
  const manifest = {
    name: package.name,
    version: package.version,
    description: package.description,
    keywords: package.keywords,
  };
  await writeFileAsync('dist/manifest.json', JSON.stringify(manifest));
  const zip = new JSZip();
  zip.file('manifest.json', await readFileAsync('dist/manifest.json'));
  zip.file('script.js', await readFileAsync('dist/bundle.js'));
  const stream = zip.generateNodeStream({
    type: 'nodebuffer',
    streamFiles: true,
  });
  stream.pipe(
    fs.createWriteStream(`dist/keepass-viewer${package.version}.plg`)
  );
  await copyFileAsync('src/index.html', 'dist/index.html');
  await copyFileAsync('src/setupTest.js', 'dist/setupTest.js');

  // Generates a mock database
  if (!(await existsAsync('dist/test.kdbx'))) {
    const credentials = new kdbxweb.Credentials(
      kdbxweb.ProtectedValue.fromString('test')
    );
    const newDb = kdbxweb.Kdbx.create(credentials, 'test');
    newDb.setVersion(3);
    const group1 = newDb.createGroup(newDb.getDefaultGroup(), 'subgroup 1');
    newDb.createGroup(newDb.getDefaultGroup(), 'subgroup 2');
    const entry = newDb.createEntry(group1);
    entry.fields.set('Title', 'Entry Title');
    entry.fields.set('UserName', 'Entry Username');
    entry.fields.set(
      'Password',
      kdbxweb.ProtectedValue.fromString('Entry Password')
    );
    const dataAsArrayBuffer = await newDb.save();
    await writeFileAsync('dist/test.kdbx', Buffer.from(dataAsArrayBuffer));
  }
})();
