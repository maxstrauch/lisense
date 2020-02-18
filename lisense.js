const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const debug = require('debug');
const chalk = require('chalk');

function getFiles(dir, filterFun) {
  const dirents = fs.readdirSync(dir, { withFileTypes: true });
  let f = [];
  for (const dirent of dirents) {
    const full = path.resolve(dir, dirent.name);
    if (dirent.isDirectory()) {
      f = f.concat(getFiles(full, filterFun));
    } else if ((filterFun ? filterFun(full) : true)) {
      f.push(full);
    }
  }
  return f;
}

function system(cmd, args) {

  const cmdProc = spawn(cmd, args, { cwd: process.cwd() });

  let stdout = '';
  cmdProc.stdout.on('data', (data) => {
    stdout += data.toString();
  });

  let stderr = '';
  cmdProc.stderr.on('data', (data) => {
    stderr += data.toString();
  });

  return new Promise((res, rej) => {
    cmdProc.on('close', (code) => {
      res({
        code,
        stdout,
        stderr
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

async function getProdPackages() {
  const data = await system('npm', ['list', '-prod']);

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

    log(`Testing base path: ${baseDir} ...`);
    try {
        if (!fs.statSync(baseDir).isDirectory()) {
            throw new Error();
        }
    } catch (_) {
        console.error(`${chalk.red("Error:")} given base path not existing!`);
        log(`Error details:`, _);
        process.exit(1);
    }

    const pkgJsonPath = path.resolve(baseDir, 'package.json');
    log(`Testing package JSON: ${pkgJsonPath} ...`);
    try {
        if (!fs.statSync(pkgJsonPath).isFile()) {
            throw new Error();
        }
    } catch (_) {
        console.error(`${chalk.red("Error:")} no package.json found in path!`);
        log(`Error details:`, _);
        process.exit(1);
    }

    try {
        JSON.parse(fs.readFileSync(pkgJsonPath).toString()).version;
    } catch (_) {
        console.error(`${chalk.red("Error:")} invalid package.json! Is this really a node project?`);
        log(`Error details:`, _);
        process.exit(1);
    }

    const nodeModulesPath = path.resolve(baseDir, 'node_modules');
    log(`Testing node modules path: ${nodeModulesPath} ...`);
    try {
        if (!fs.statSync(nodeModulesPath).isDirectory()) {
            throw new Error();
        }
    } catch (_) {
        console.error(`${chalk.red("Error:")} no node_modules folder found! Did you run 'npm i'?`);
        log(`Error details:`, _);
        process.exit(1);
    }

    const entries = fs.readdirSync(nodeModulesPath);
    log(`Enumerating entries in node_modules: ${entries.length} elements found!`);
    if (entries.length < 1) {
        console.error(`${chalk.red("Error:")} the node_modules folder is empty!`);
        process.exit(1);
    }

    log(`Everything seems correct. Can inspect now!`);
}

function scanNodeModules(baseDir) {
    const log = debug('app:getPackageJsonAndLicenseFiles');

    const moduleMap = {};

    const basePath = path.resolve(baseDir, './node_modules/');
    log(`Searching for node_modules in: ${basePath}`);

    getFiles(basePath, (file) => {
      return file.indexOf('package.json') > -1 || file.indexOf('LICENSE') > -1;
    }).forEach((fileName) => {
  
  
      const index = fileName.lastIndexOf('node_modules/') + 13;
      let followingSlash = fileName.indexOf('/', index + 1);
      let pkgName = fileName.substring(index, followingSlash);
  
      if (pkgName.startsWith('@')) {
        followingSlash = fileName.indexOf('/', index + 1 + pkgName.length);
        pkgName = fileName.substring(index, followingSlash);
      }
  
  
      if (!(pkgName in moduleMap)) {
        moduleMap[pkgName] = [];
      }
      moduleMap[pkgName].push(fileName);
    });
  
  
    let modules = Object.getOwnPropertyNames(moduleMap);
    // console.log(`${modules.length} node_modules found!`);
    // modules.sort();

    return [ moduleMap, modules ];
}


async function filterModulesByProd(modules) {

    const prodPackages = await getProdPackages();
    console.log(`${prodPackages.length} PROD node_modules found!`);
  
    // Reduce the set
    const tmpSelected = [];
    for (let i = 0; i < prodPackages.length; i++) {
      if (modules.includes(prodPackages[i])) {
        tmpSelected.push(prodPackages[i]);
      } else {
        console.log("Could not find module:", prodPackages[i]);
      }
    }
  
    if (prodPackages.length !== tmpSelected.length) {
      console.log("ERROR: Numer of packages differs: ", prodPackages.length, tmpSelected.length);
      process.exit(1);
    }
  
    return tmpSelected;
}

function extractLicenses(moduleMap, modules) {
    const log = debug(`app:extractLicenses`);

    const modulesWithLicenses = [];
    const modulesWithoutLicenses = [];
  
    for (let i = 0; i < modules.length; i++) {
      const module = moduleMap[modules[i]];
  
      const pkgJsonPath = module.find((p) => (p.indexOf('package.json') > -1));
  
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
        // console.log("ERROR: cannot find repo url for: ", pkgJsonPath)
  
      } else {
        const licenseFilePath = module.find((p) => (p.toLowerCase().indexOf('license') > -1));
        const licnseFileName = path.basename(licenseFilePath || '');
        licenseFileUrl = `${sourceBase}/blob/master/${licnseFileName}`;
      }
  
      if (!pkgJson.license && !pkgJson.licenses) {
        modulesWithoutLicenses.push(pkgJsonPath);
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

function writeCsvResultFile(basePath, filename, modulesWithLicenses) {
    const pkgJson = JSON.parse(fs.readFileSync("./package.json").toString());

    let csv = `"module name","licenses","repository","licenseUrl","parents"\n`;
    for (let i = 0; i < modulesWithLicenses.length; i++) {
        const fields = [
        `${modulesWithLicenses[i].name}@${modulesWithLicenses[i].version}`,
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
    isValidStartDir
};
