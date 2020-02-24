const { isValidStartDir } = require('../lisense');

const mock = require('mock-fs');

const fs = {
    './node_modules': {
        'module1': {
            'package.json': JSON.stringify({ name: 'module1', version: '1.0.0', license: 'MIT' }),
            'LICENSE': 'this is a license',
        },
        'module2': {
            'package.json': JSON.stringify({ name: 'module2', version: '1.0.0' }),
            'license': 'this is a license',
        },
    },
    './package.json': JSON.stringify({ name: 'app', version: '1.0.0' }),
    './root.txt': 'Inside the rootdir only!',
    './.DS_Store': Buffer.from([0xaa, 0xff, 0x20]),
};

describe('function isValidStartDir', () => {

    test('should return normally if correct', () => {

        mock(fs);
        isValidStartDir('./');
        mock.restore();

        

    });

    // test('list the correct prod packages for this module', async () => {

    //     const pkgs = await getProdPackages(BASE_DIR, false);

    //     expect(pkgs).toStrictEqual([
    //         "chalk",
    //         "commander",
    //         "debug",
    //         "ms",
    //         "ansi-styles",
    //         "supports-color",
    //         "has-flag",
    //         "@types/color-name",
    //         "color-convert",
    //         "color-name"
    //     ]);
    // });

    // test('check with pedantic mode successfull', async () => {

    //     const pkgs = await getProdPackages(BASE_DIR, true);

    //     expect(pkgs).toStrictEqual([
    //         "chalk",
    //         "commander",
    //         "debug",
    //         "ms",
    //         "ansi-styles",
    //         "supports-color",
    //         "has-flag",
    //         "@types/color-name",
    //         "color-convert",
    //         "color-name"
    //     ]);
    // });

});