#!/usr/bin/env node

const chalk = require('chalk');
const program = require('commander');
const debug = require('debug');
const fs = require('fs');
const {
    isValidStartDir,
    scanNodeModules,
    filterModulesByProd,
    extractLicenses,
    writeJsonResultFile,
    writeCsvResultFile,
    compareToWhiteListFile,
    getDistinctLicenses,
    printReport,
    getPackageJsonOfTarget,
    generateSampleWhitelist
} = require('./lisense');
const packageJson = require('./package.json');

program
    .version(packageJson.version)
    .option('-d, --dir <directory>', 'The directory to use as base directory to start scanning. Use a - for input mode where a list of directories, one per line, can be provided using stdin', process.cwd())
    .option('-p, --prod', 'Only inspect packages used for prod deployment (no devDependencies)', false)
    .option('-v, --verbose', 'Enable verbose program output', false)
    .option('-q, --quiet', 'Force quiet mode on stdout (if errors are thrown they are still outputted but they are printed to stderr)', false)
    .option('-c, --csv <file>', 'CSV output of results', false)
    .option('-j, --json <file>', 'JSON output of results', false)
    .option('-f, --fail <license-regex>', 'Fail with exit code 2 if at least one of the license names matches the given regex', null)
    .option('-r, --report <mode>', 'Generates a report on stderr with one of the modes: none (default), short, long', 'none')
    .option('-l, --licenses', 'Print a list of used licenses')
    .option('-z, --fail-on-missing', 'Fails the application with exit code 3 iff there is at least one node_module which cannot be inspected')
    .option('--pedantic', 'Checks at some places if data can be confirmed from an other source (e.g. NPM)')
    .option('-w, --whitelist <file>', 'JSON file to define a whitelist of allowed licenses and packages', false)
    .option('--create-new-whitelist <file>', 'Creates an empty, example whitlist file and exits regardless of any other flag', false)

program.parse(process.argv);

program.verbose && debug.enable('*');

const quietMode = program.quiet === true;

let whitelistData = null;

async function scan(program, isComineMode) {
    isComineMode = isComineMode === true;

    let returnableMods = [];
    const pkgJson = getPackageJsonOfTarget(program.dir);
    !quietMode && console.log(`Inspecting node_modules of ${pkgJson.name}@${pkgJson.version} ...`);

    // Get all node modules relative to the given root dir
    let [ modulesMap, modules ] = scanNodeModules(program.dir);

    if (program.prod) {
        modules = await filterModulesByProd(program.dir, modules, program.pedantic);
    }

    // Failed to find prod modules etc.
    if (!modules) {
        return {
            exitCode: 1,
            mods: []
        };
    }

    const [ mods, modsWithout ] = extractLicenses(modulesMap, modules);

    if (modsWithout.length > 0) {
        console.error(`${chalk.yellow("WARNING:")} Found ${modsWithout.length} modules which could not be inspected:`);
        modsWithout.forEach((mod) => {
            console.error(`  - ${mod.name}@${mod.version || 'N/A'} (${mod.localPath})`);
        });
    }

    // Print a report to stdout, if enabled
    if (program.report && ['short', 'long'].includes(program.report.toLowerCase())) {
        printReport(mods, program.report.toLowerCase() === 'long');
    }

    // Print a list of all distinct licenses to stdout
    if (program.licenses) {
        const licenses = getDistinctLicenses(mods);
        !quietMode && console.log(`Used licenses (${licenses.length}): ${licenses.join(', ')}`);
    }

    if (!isComineMode) {
        // Write all data to JSON file
        if (program.json) {
            if (!writeJsonResultFile(program.json, mods)) {
                return {
                    exitCode: 1,
                    mods: []
                };
            }
        }

        // Write all data to CSV file
        if (program.csv) {
            if (!writeCsvResultFile(program.dir, program.csv, mods)) {
                return {
                    exitCode: 1,
                    mods: []
                };
            }
        }
    } else {
        returnableMods = mods.map(mod => ({...mod, parents: [ pkgJson.name ]}));
    }

    if (program.fail) {
        const regex = new RegExp(program.fail, 'i');
        const licenses = getDistinctLicenses(mods);
        for (let i = 0; i < licenses.length; i++) {
            const license = licenses[i];

            if (license.match(regex)) {
                !quietMode && console.log(`${chalk.red("Error:")} the license "${license}" conflicts with the given regex!`);
                return {
                    exitCode: 2,
                    mods: []
                };
            }
        }
    }

    // If the option fail-on-missing is set, the program fails with error code 3
    // if there is at least one module which can't be scanned
    if (program.failOnMissing && modsWithout.length > 0) {
        console.error(`${chalk.red("Error:")} ${modsWithout.length} modules cannot be inspected!`);
        return {
            exitCode: 3,
            mods: []
        };
    }

    // Compare the computed list of licenses to the provided list
    if (program.whitelist && whitelistData) {
        if (compareToWhiteListFile(whitelistData, mods).length > 0) {
            return {
                exitCode: 4,
                mods: []
            };
        }
    }

    return {
        exitCode: 0,
        mods: returnableMods || []
    };
}

function sortAndMakeUnique(allMods) {
    const uniqueMods = [];

    for (let i = 0; i < allMods.length; i++) {

        let contained = null;
        for (let j = 0; j < uniqueMods.length; j++) {
            if (
                uniqueMods[j].name === allMods[i].name &&
                uniqueMods[j].version === allMods[i].version &&
                uniqueMods[j].license === allMods[i].license
            ) {
                contained = uniqueMods[j];
                break;
            }
        }

        if (contained) {
            contained.parents = [...new Set([...contained.parents, ...allMods[i].parents])];
        } else {
            uniqueMods.push(allMods[i]);
        }
    }

    return uniqueMods.sort((a, b) => (a.name > b.name ? 1 : (a.name < b.name ? -1 : 0)));
}

async function main() {
    if (program.createNewWhitelist) {
        generateSampleWhitelist(program.createNewWhitelist)
        return;
    }


    // Read the whitelist data in early, to fail early and not
    // go through the entire process of checking to then fail
    // on loading the JSON file
    if (program.whitelist) {
        try {
            whitelistData = JSON.parse(fs.readFileSync(program.whitelist).toString());
        } catch (ex) {
            console.error(`${chalk.red("Error:")} the whitelist provided is not valid JSON!`);
            process.exit(1);
        }
    }

    if (program.dir === '-') {
        // Takes input from stdin and treats every line as a directory, called "input mode"
        // ---

        const stdinBuffer = fs.readFileSync(0);
        const files = stdinBuffer
            .toString()
            .split('\n')
            .map(ln => (ln || '').trim())
            .filter(ln => !!ln);

        if (files.length < 1) {
            console.error(`${chalk.red("Error:")} no directory list provided on stdin to scan!`);
            process.exit(1);
        }

        const clonedProgram = JSON.parse(JSON.stringify(program));

        let allMods = [];

        for (let i = 0; i < files.length; i++) {
            clonedProgram.dir = files[i];

            if (!isValidStartDir(clonedProgram.dir)) {
                console.error(`${chalk.red("Error:")} base path "${clonedProgram.dir}" not existing or not a NodeJS project!`);
                process.exit(1);
            }

            !quietMode && console.log(`${i+1}/${files.length}: ${clonedProgram.dir}`);
            !quietMode && console.log("----------------------------------------------");

            const code = await scan(clonedProgram, true);

            if (code.exitCode > 0) {
                process.exit(code.exitCode);
            }

            allMods = allMods.concat(code.mods);

            !quietMode && console.log(" ");
        }

        // Extract only the mods which are unique
        const allUniqueMods = sortAndMakeUnique(allMods);

        !quietMode && console.log("---");
        !quietMode && console.log(`Found ${allMods.length} and reduced them to ${allUniqueMods.length} modules.`);

        // Write all data to JSON file
        if (program.json) {
            writeJsonResultFile(program.json, allMods);
        }

        // Write all data to CSV file
        if (program.csv) {
            writeCsvResultFile(program.dir, program.csv, allMods);
        }

        process.exit(0); // Should not reach here
    } else {
        // A normal scan for a given directory
        // ---

        if (!isValidStartDir(program.dir)) {
            console.error(`${chalk.red("Error:")} base path not existing or not a NodeJS project!`);
            process.exit(1);
        }

        const code = await scan(program);
        process.exit(code.exitCode);
    }
}

main().catch((ex) => { console.error(chalk.red("Internal program error: " + ex)); process.exit(1); });