const yargs = require('yargs');
const path = require('path');
const fs = require('fs');
const util = require('util');
const _ = require('lodash');
const SKIP = ['else', 'end', 'steps %{', '}', 'eventually do']

/**
 * Walks acceptance suite path and looks for all
 * files.
 * 
 * @param {*} dir 
 * @param {*} count
 */
var findFiles = function(dir, done) {
  var results = [];
   fs.readdir(dir, function(err, list) {
    if (err) return done(err);
    var pending = list.length;
    if (!pending) return done(null, results);
    list.forEach(function(file) {
      file = path.resolve(dir, file);
        fs.stat(file, function(err, stat) {
          if (stat && stat.isDirectory()) {
          findFiles(file, function(err, res) {
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
  return Object.keys(unordered).sort(function(a,b){return unordered[b]-unordered[a]})
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
    line = line.trim()
    if(skip(line)) continue
    duplicateSteps[line] = duplicateSteps[line] || 0;
    duplicateSteps[line]++;
  }
  return duplicateSteps;
}
  
/*
 * Skip commented out steps and documentation 
 */
function skip(line){
  return (line[0] === "#" || line[0] === "@" || line === "" || SKIP.includes(line)) 
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


let promiseFindFiles = util.promisify(findFiles)

if (argv.dir) {
  console.log(`Listing ${argv.count} most duplicated steps...`)
  const acceptanceSuitePath = path.join(argv.dir, 'features');
  //passsing directoryPath and callback function
  promiseFindFiles(acceptanceSuitePath).then(function(files) {
    return Promise.all(files.map(function(file){
      return findDuplicateSteps(file)
    }));
  }).then(function(results){
    let steps = results.reduce(function(steps, duplicates){
      return _.mergeWith(steps, duplicates, mergeDuplicates);
    }, {});
    ordered = sortDescending(steps)
    console.log(ordered.slice(0,argv.count).map(key => (`${steps[key]} ${key}`)))
  });
}

