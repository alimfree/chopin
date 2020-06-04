const yargs = require('yargs');
const path = require('path');
const fs = require('fs');
const util = require('util');
const _ = require('lodash');
const SKIP = ['else', 'end', 'steps %{', '}', 'eventually do']

/**
 * Recursively Walks acceptance suite path and looks for all
 * files.
 * 
 * @param {*} dir 
 */
function findFiles(dir, done) {
  var results = [];
   fs.readdir(dir, function walkDir(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function openPath(file) {
      file = path.resolve(dir, file);
        fs.stat(file, function OpenDir(err, stat) {
          if (stat && stat.isDirectory()) {
          findFiles(file, function collectAllFiles(err, res) {
            results = results.concat(res);
            if (!--pending) done(null, results);
          });
        } else {
        results.push(file);
        if (!--pending) done(null, results);
        }
      });
    });
  });
};

/*
 * Sorts hash in descending order, most duplicated
 * steps in begining of hash.
 */
function sortDescending(unordered){
  return Object.keys(unordered).sort(function sortHash(a,b){return unordered[b]-unordered[a]})
}

/*
 * Custom merge method to add all duplicates across
 * files.
 */
function mergeDuplicates(objValue, srcValue){
  if (_.isNumber(objValue)) {
    return objValue + srcValue;
  }
}
  
/*
* Counts each occurrence of a step inside a feature
*/
async function findDuplicateSteps(file){
  let lineReader = require('readline').createInterface({
    input: require('fs').createReadStream(file)
  });
  let duplicateSteps = {};

  for await (let line of lineReader) {
    line = line.trim();
    if(skip(line)) continue;
    duplicateSteps[line] = duplicateSteps[line] || 0;
    duplicateSteps[line]++;
  }
  return duplicateSteps;
}
  
/*
 * Skip commented out steps and documentation 
 */
function skip(line){
  return (line[0] === "#" || line[0] === "@" || line === "" || SKIP.includes(line));
}

const argv = yargs
  .command('chopin', 'Scans regression suite and outputs duplicate lines in descending order', {
      dir: {
          description: 'the acceptance suite directory path',
          alias: 'd',
            type: 'string'
      },
      count: {
          description: 'the number of steps to display',
          alias: 'c',
          type: 'number',
          default: 10
      }
  })
  .help()
  .alias('help', 'h')
  .argv;


let promiseFindFiles = util.promisify(findFiles);

if (argv.dir) {
  console.log(`Listing ${argv.count} most duplicated steps...`)
  const acceptanceSuitePath = path.join(argv.dir, 'features');
  promiseFindFiles(acceptanceSuitePath).then(function collectDuplicateStepsInAll(files) {
    return Promise.all(files.map(function searchEachFile(file){
      return findDuplicateSteps(file)
    }));
  }).then(function printMostDuplicatedSteps(results){
    let steps = results.reduce(function formatDuplicateSteps(steps, duplicates){
      return _.mergeWith(steps, duplicates, mergeDuplicates);
    }, {});
    ordered = sortDescending(steps)
    console.log(ordered.slice(0,argv.count).map(key => (`${steps[key]} ${key}`)))
  });
}

