#!/usr/bin/env node

const chalk = require('chalk');
const program = require('commander');
const debug = require('debug');
const { 
    isValidStartDir,
    scanNodeModules, 
    filterModulesByProd, 
    extractLicenses, 
    writeJsonResultFile, 
    writeCsvResultFile, 
    getDistinctLicenses, 
    printReport 
} = require('./lisense');
const packageJson = require('./package.json');
 
program
  .version(packageJson.version)
  .option('-d, --dir <directory>', 'The directory to use as base directory to start scanning', process.cwd())
  .option('-p, --prod', 'Only inspect packages used for prod deployment (no devDependencies)', false)
  .option('-v, --verbose', 'Enable verbose program output', false)
  .option('-c, --csv <file>', 'CSV output of results', false)
  .option('-j, --json <file>', 'JSON output of results', false)
  .option('-f, --fail <license-regex>', 'Fail with exit code 2 if at least one of the license names matches the given regex', null)
  .option('-r, --report <mode>', 'Generates a report on stderr with one of the modes: none (default), short, long', 'none')
  .option('-l, --licenses', 'Print a list of used licenses')
  .option('-z, --fail-on-missing', 'Fails the application with exit code 3 iff there is at least one node_module which cannot be inspected')
 
program.parse(process.argv);

program.verbose && debug.enable('*');

async function main() {
    console.log(`Inspecting node_modules ...`);

    isValidStartDir(program.dir);

    // Get all node modules relative to the given root dir
    let [ modulesMap, modules ] = scanNodeModules(program.dir);

    if (program.prod) {
        modules = await filterModulesByProd(modules);
    }

    const [ mods, modsWithout ] = extractLicenses(modulesMap, modules);

    if (modsWithout.length > 0) {
        console.error(`${chalk.yellow("WARNING:")} Found ${modsWithout.length} modules which could not be inspected:`);
        modsWithout.forEach((mod) => {
            console.error(` - ${mod}`);
        });
    }

    // Print a report to stdout, if enabled
    if (program.report && ['short', 'long'].includes(program.report.toLowerCase())) {
        printReport(mods, program.report.toLowerCase() === 'long');
    }

    // Print a list of all distinct licenses to stdout
    if (program.licenses) {
        const licenses = getDistinctLicenses(mods);
        console.log(`Used licenses (${licenses.length}): ${licenses.join(', ')}`);
    }

    // Write all data to JSON file
    if (program.json) {
        writeJsonResultFile(program.json, mods);
    }

    // Write all data to CSV file
    if (program.csv) {
        writeCsvResultFile(program.dir, program.csv, mods);
    }

    if (program.fail) {
        const regex = new RegExp(program.fail, 'i');
        getDistinctLicenses(mods).forEach((license) => {
            if (license.match(regex)) {
                console.log(`${chalk.red("Error:")} the license "${license}" conflicts with the given regex!`);
                process.exit(2);
            }
        });
    }

    // If the option fail-on-missing is set, the program fails with error code 3
    // if there is at least one module which can't be scanned
    if (program.failOnMissing && modsWithout.length > 0) {
        console.error(`${chalk.red("Error:")} ${modsWithout.length} modules cannot be inspected!`);
        process.exit(3);
    }

    // Execution finished successfully
    process.exit(0);
}

main().catch((ex) => { console.error(chalk.red(ex)); process.exit(1); });