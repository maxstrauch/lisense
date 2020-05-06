const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const debug = require('debug');
const chalk = require('chalk');

/**
 * It is possible to make a "native" node call:
 *   fs.readdirSync(dir, { withFileTypes: true })
 * BUT: somewhere between Node 10.0.0 and Node 10.18.0 this
 * feature was added; if the node version is smaller,
 * the function getFilesRec() will fail, because readdirSync returns
 * only a string array ...
 * 
 * This function wraps this behaviour.
 */
function readdirSyncWithFileTypes(dir) {
    const files = fs.readdirSync(dir);
    return files.map((fileName) => {
        const obj = fs.statSync(path.resolve(dir, fileName));
        obj.name = fileName;
        return obj;
    });
}

function getFilesRec(dir, filterFun) {
  const dirents = readdirSyncWithFileTypes(dir);
  let f = [];
  for (const dirent of dirents) {
    const full = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      f = f.concat(getFilesRec(full, filterFun));
    } else if ((filterFun ? filterFun(full) : true)) {
      f.push(full);
    }
  }
  return f;
}

function system(cmd, args, opts) {

  const cmdProc = spawn(cmd, args, { 
      ...{
        cwd: process.cwd()
      },
      ...(opts || {})
   });

   let combined = '';

  let stdout = '';
  cmdProc.stdout.on('data', (data) => {
    stdout += data.toString();
    combined += data.toString();
  });

  let stderr = '';
  cmdProc.stderr.on('data', (data) => {
    stderr += data.toString();
    combined += data.toString();
  });

  return new Promise((res, rej) => {
    cmdProc.on('close', (code) => {
      res({
        code,
        stdout: stdout,
        stderr: stderr,
        out: combined,
      });
    })
  });
}


function repoFragmentToUrl(fragment) {
  const log = debug('app:repoFragmentToUrl');
  if (!fragment) {
    return null;
  }

  if (
    (fragment.type && fragment.url && fragment.type === 'git') ||
    (fragment.url && fragment.url.indexOf('git') > -1)
  ) {

    const urlMatch = fragment.url.match(/(github.com\/.*?\/.*?\/?.*?$)/);
    if (urlMatch) {
      let urlFragment = urlMatch[1].trim();
      if (urlFragment.endsWith(".git")) {
        urlFragment = urlFragment.substring(0, urlFragment.length - 4);
      }
      return `https://${urlFragment}`;
    } else {
        log("Can't handle GIT reference: ", fragment.url);
    }

  } else {
    log("Can't handle: ", fragment);
  }


  return null;
}



async function getProdPackages(baseDir, pedantic) {
    const log = debug('getProdPackages');

    const pending = [baseDir];
    const visited = [];
    
    do {
      const relPath = pending.pop();
      const pkgJsonPath = path.resolve(relPath, 'package.json');
    
      try {
        const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath).toString());
    
        if (pkgJson.dependencies) {
          const pkgs = Object.getOwnPropertyNames(pkgJson.dependencies);
    
          for (let i = 0; i < pkgs.length; i++) {
            if (visited.includes(pkgs[i])) {
              continue; // Already visited!
            }
    
            visited.push(pkgs[i]);
            pending.push(path.resolve(relPath, 'node_modules', pkgs[i]));
            pending.push(path.resolve(baseDir, 'node_modules', pkgs[i]));
          }
        } else {
          // console.log("--> No dependencies for:", pkgJsonPath);
        }
      } catch (ex) {
        // Ignore
        // console.log(ex);
      }
    } while (pending.length > 0);


    if (pedantic === true) {

        const packagesViaNpm = await getProdPackagesViaNpm(baseDir);

        if (packagesViaNpm.length !== visited.length) {
            console.error(`Error: npm found ${packagesViaNpm.length} vs. ${visited.length} by lisense!`);
        } else {
            log(`Package count has been successfully checked against NPM!`);
        }

    }
    
    log(`Found ${visited.length} packages for prod!`);
    

    return visited;
}

/*


Alternative implementation which uses npm and parses the output:
-----

*/
async function getProdPackagesViaNpm(baseDir) {
    const log = debug('getProdPackagesViaNpm');

    const whichNpm = await system('which', ['npm']);

    if (whichNpm.code !== 0 || whichNpm.stdout.indexOf('npm') < 1) {
        
        log(`No executable "npm" installed on this system!`);
        return [];

    }


  const data = await system('npm', ['list', '-prod'], { cwd: baseDir });

  const pkgsProd = data.stdout.split('\n').map((ln) => {
    ln = ln.trim();
    const lastAtIndex = ln.lastIndexOf('@');
    let startIndex = -1;
    for (let i = 0; i < ln.length; i++) {
      if (`${ln.charAt(i)}`.toLowerCase().match(/[a-z|@]/)) {
        startIndex = i;
        break;
      }
    }

    if (startIndex < -1 || lastAtIndex < -1) {
      return null;
    }

    let str = ln.substring(startIndex, lastAtIndex);

    const lastSpace = str.lastIndexOf(' ');
    if (lastSpace > -1) {
      str = str.substring(lastSpace);
    }

    str = str.trim();
    return str;
  }).filter((x) => (!!x));

  pkgsProd.shift(); // The first is always the package itself

  return [...new Set(pkgsProd)];
}


// ---

function isValidStartDir(baseDir) {
    const log = debug('app:isValidStartDir');

    try {
        log(`Testing base path: ${baseDir} ...`);
        const statDir = fs.statSync(baseDir);
        if (!statDir || !statDir.isDirectory()) {
            return false;
        }

        const pkgJsonPath = path.resolve(baseDir, 'package.json');
        log(`Testing package JSON: ${pkgJsonPath} ...`);
        const statFile = fs.statSync(pkgJsonPath);
        if (!statFile || !statFile.isFile()) {
            return false;
        }

        JSON.parse(fs.readFileSync(pkgJsonPath).toString()).version;

        const nodeModulesPath = path.resolve(baseDir, 'node_modules');
        log(`Testing node modules path: ${nodeModulesPath} ...`);
        const statModulesDir = fs.statSync(nodeModulesPath);
        if (!statModulesDir || !statModulesDir.isDirectory()) {
            return false;
        }
        
        const entries = fs.readdirSync(nodeModulesPath);
        log(`Enumerating entries in node_modules: ${entries.length} elements found!`);
        if (entries.length < 1) {
            return false;
        }
    } catch (ex) {
        log(`Error details:`, ex);
        return false;
    }    

    log(`Everything seems correct. Can inspect now!`);
    return true;
}

function scanNodeModules(baseDir) {
    const log = debug('app:getPackageJsonAndLicenseFiles');

    const moduleMap = {};

    const basePath = path.resolve(baseDir, 'node_modules'+path.sep);
    log(`Searching for node_modules in: ${basePath}`);

    
    getFilesRec(basePath, (file) => {
      return file.indexOf('package.json') > -1 || file.toLowerCase().indexOf('license') > -1;
    })
    .forEach((fileName) => {
      const index = fileName.lastIndexOf('node_modules'+path.sep) + 13;
      let followingSlash = fileName.indexOf(path.sep, index + 1);
      let pkgName = fileName.substring(index, followingSlash);
      
      if (pkgName.startsWith('@')) {
        followingSlash = fileName.indexOf(path.sep, index + 1 + pkgName.length);
        pkgName = fileName.substring(index, followingSlash);
        pkgName = pkgName.replace(path.sep,'/');
      }
  
      if (!(pkgName in moduleMap)) {
        moduleMap[pkgName] = [];
      }
      moduleMap[pkgName].push(fileName);
    });
  
  
    let modules = Object.getOwnPropertyNames(moduleMap);

    // Sort all resulting files in a way, that the shortest path per module
    // to a package.json is taken as the "root" package.json
    // ---
    const _sortByLen = (a, b) => {
        return `${a}`.length-`${b}`.length;
    };

    for (let i = 0; i < modules.length; i++) {
        const arr = moduleMap[modules[i]].sort(_sortByLen);
        
        const selected = [
            arr.find((el) => (el.indexOf('package.json') > -1)),
            arr.find((el) => (el.toLowerCase().indexOf('license') > -1))
        ].filter((el) => (!!el));

        moduleMap[modules[i]] = selected;
    }

    return [ moduleMap, modules ];
}


async function filterModulesByProd(baseDir, modules, pedantic) {
    const log = debug('filterModulesByProd');

    const prodPackages = await getProdPackages(baseDir, pedantic);
    log(`${prodPackages.length} PROD node_modules found!`);
  
    // Reduce the set
    const tmpSelected = [];
    for (let i = 0; i < prodPackages.length; i++) {
      if (modules.includes(prodPackages[i])) {
        tmpSelected.push(prodPackages[i]);
      } else {
        log("Could not find module:", prodPackages[i]);
      }
    }
  
    if (prodPackages.length !== tmpSelected.length) {
      console.error("ERROR: Number of packages differs: ", prodPackages.length, tmpSelected.length);
      console.error("You might want to run `npm i` to solve this problem since most of the time it causes this issue!");
      process.exit(1);
    }
  
    return tmpSelected;
}

function detectLicenseFromFile(content) {
    const log = debug('detectLicenseFromFile');
    log('File:', content);

    content = content.toLowerCase();

    if (content.indexOf('mit license') > -1) {
        return 'MIT';
    } else if (content.indexOf('gpl') > -1) {
        return 'GPL';
    } else {
        // ...
        // TODO: extend this function
    }

    return 'UNKNOWN';
}

function tryFallbackLicenseDetection(modPkgJsonPath, paths) {
    const log = debug('tryFallbackLicenseDetection');

    log(`Fallback:\n  modPkgJsonPath=${modPkgJsonPath}\n  paths=${JSON.stringify(paths)}`);

    const licenseFile = (paths || []).find((el) => (el.toLowerCase().indexOf('license') > -1));
    if (licenseFile) {
        log(`Found license file: ${licenseFile}`);

        try {
            return detectLicenseFromFile(fs.readFileSync(licenseFile).toString());
        } catch(ex) {
            log(`Error: cannot read license file:`, ex);
        }
    }

    // TODO: add e.g. search in remote dir etc.
    return 'UNKNOWN';
}

function extractLicenses(moduleMap, modules) {
    const log = debug(`app:extractLicenses`);

    const modulesWithLicenses = [];
    const modulesWithoutLicenses = [];
  
    for (let i = 0; i < modules.length; i++) {
      const _module = moduleMap[modules[i]];
  
      const pkgJsonPath = _module.find((p) => (p.indexOf('package.json') > -1));
  
      let pkgJson = {};
      try {
        pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath).toString());
      } catch (ex) {
        log("ERROR: invalid package JSON:", pkgJsonPath);
        continue;
      }
  
      const sourceBase = repoFragmentToUrl(pkgJson.repository || {});
  
      let licenseFileUrl = null;
  
      if (!sourceBase) {
        log("ERROR: cannot find repo url for: ", pkgJsonPath)
      } else {
        const licenseFilePath = _module.find((p) => (p.toLowerCase().indexOf('license') > -1));
        const licnseFileName = path.basename(licenseFilePath || '');
        licenseFileUrl = `${sourceBase}/blob/master/${licnseFileName}`;
      }

      if (!pkgJson.license && !pkgJson.licenses) {
        pkgJson.license = tryFallbackLicenseDetection(pkgJsonPath, _module);
      }

  
      if (!pkgJson.license && !pkgJson.licenses) {
        
        modulesWithoutLicenses.push({
            name: modules[i],
            version: pkgJson.version || null,
            localPath: pkgJsonPath,
        });

      } else {
  
        if (pkgJson.licenses && Array.isArray(pkgJson.licenses)) {
          pkgJson.license = pkgJson.licenses.map((x) => (x.type)).join('+');
        }
  
        if ((typeof pkgJson.license) === 'object' && pkgJson.license.type) {
          pkgJson.license = pkgJson.license.type;
        }
  
        modulesWithLicenses.push({
          name: modules[i],
          license: pkgJson.license || pkgJson.licenses,
          url: licenseFileUrl,
          version: pkgJson.version,
          originalPaths: moduleMap[modules[i]],
          repoBaseUrl: sourceBase,
        });
        
      }
  
    }

    return [
        modulesWithLicenses,
        modulesWithoutLicenses
    ];

}


function writeJsonResultFile(filename, modules) {
    if (filename === '-') {
        console.log(JSON.stringify(modules, null, 4));
        return;
    }
    fs.writeFileSync(filename, JSON.stringify(modules, null, 4));
}

function getPackageJsonOfTarget(basePath) {
    const log = debug('app:getPackageJsonOfTarget');
    try {
        const pkgJson = JSON.parse(fs.readFileSync(path.resolve(basePath, "package.json")).toString());
        return pkgJson;
    } catch (ex) {
        log(`Failed to get package.json of target:`, ex);

        console.error("Error: cannot read package.json in dir " + basePath + "! No node package?");
        process.exit(1);
    }
}

function writeCsvResultFile(basePath, filename, modulesWithLicenses) {
    const pkgJson = getPackageJsonOfTarget(basePath);

    let csv = `"module name","version","licenses","repository","licenseUrl","parents"\n`;
    for (let i = 0; i < modulesWithLicenses.length; i++) {
        const fields = [
            modulesWithLicenses[i].name,
            modulesWithLicenses[i].version,
            modulesWithLicenses[i].license,
            modulesWithLicenses[i].repoBaseUrl,
            modulesWithLicenses[i].url,
            pkgJson.name
        ];
        csv += `${fields.map((x) => (`"${x}"`)).join(",")}\n`;
    }

    csv = csv.trim();

    if (filename === '-') {
        console.log(csv);
        return;
    }
    fs.writeFileSync(filename, csv);
}

function getDistinctLicenses(modulesWithLicenses) {
    const overviewMap = {};
    for (let i = 0; i < modulesWithLicenses.length; i++) {
      if (!(modulesWithLicenses[i].license in overviewMap)) {
        overviewMap[modulesWithLicenses[i].license] = [];
      }
      overviewMap[modulesWithLicenses[i].license].push(modulesWithLicenses[i].name);
    }
  
    const distinctLicenses = Object.getOwnPropertyNames(overviewMap);

    return distinctLicenses;
}

function printReport(modulesWithLicenses, detailed) {

    const overviewMap = {};
    for (let i = 0; i < modulesWithLicenses.length; i++) {
      if (!(modulesWithLicenses[i].license in overviewMap)) {
        overviewMap[modulesWithLicenses[i].license] = [];
      }
      overviewMap[modulesWithLicenses[i].license].push(modulesWithLicenses[i].name);
    }
  
  
    const distinctLicenses = Object.getOwnPropertyNames(overviewMap);
    for (let i = 0; i < distinctLicenses.length; i++) {
      console.log('\x1b[36m%s\x1b[0m (' + overviewMap[distinctLicenses[i]].length + ')', distinctLicenses[i]);
      const moduleNames = overviewMap[distinctLicenses[i]].join(', ');
      if (detailed) {
        console.log("   " + moduleNames);
      } else {
        console.log("   " + (moduleNames.length > 100 ? moduleNames.substring(0, 100) + '...' : moduleNames));
      }
    }
  

}


module.exports = {
    scanNodeModules,
    filterModulesByProd,
    extractLicenses,
    writeJsonResultFile,
    writeCsvResultFile,
    getDistinctLicenses,
    printReport,
    isValidStartDir,
    getPackageJsonOfTarget,


    readdirSyncWithFileTypes,
    getFilesRec,
    system,
    repoFragmentToUrl,
    getProdPackages,
};
