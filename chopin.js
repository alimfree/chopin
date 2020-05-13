const yargs = require('yargs');
const path = require('path');
const fs = require('fs');

const argv = yargs
    .command('chopin', 'Scans regression suite and outputs duplicate lines in descending order', {
        dir: {
            description: 'the acceptance suite directory path',
            alias: 'd',
            type: 'string',
        }
    })
    .help()
    .alias('help', 'h')
    .argv;

if (argv.dir) {
  const acceptanceSuitePath = path.join(__dirname, argv.dir, 'features');
  //passsing directoryPath and callback function
  fs.readdir(acceptanceSuitePath, function (err, files) {
      //handling error
      if (err) {
          return console.log('Unable to scan acceptance suite directory: ' + err);
      }
      //listing all files using forEach
      files.forEach(function (file) {
          // Do whatever you want to do with the file
          console.log(file);
      });
  });
}