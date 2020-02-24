const { getFilesRec, readdirSyncWithFileTypes } = require('../lisense');
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

describe('function readdirSyncWithFileTypes', () => {

    test('returns an array', () => {
        
        mock(fs);
        const arr = readdirSyncWithFileTypes('./');
        mock.restore();

        expect(Array.isArray(arr)).toBe(true);
    });

    test('returns objects with stat functions', () => {

        mock(fs);
        const arr = readdirSyncWithFileTypes('./');
        mock.restore();

        for (let i = 0; i < arr.length; i++) {
            expect(typeof arr[i].isDirectory).toBe("function");
        }
    });

    test('returns objects with file name', () => {

        mock(fs);
        const arr = readdirSyncWithFileTypes('./');
        mock.restore();

        for (let i = 0; i < arr.length; i++) {
            expect((typeof arr[i].name)).toBe("string");
            expect(arr[i].name.length > 0).toBe(true);
        }
    });

    test('returns correct directory listing', () => {

        mock(fs);
        const arr = readdirSyncWithFileTypes('./');
        mock.restore();

        const fileNames = arr.map((entry) => (entry.name)).sort();

        expect(fileNames).toStrictEqual(['.DS_Store', 'node_modules', 'package.json', 'root.txt']);
    });

});

describe('function getFilesRec', () => {

    test('returns all files', () => {

        mock(fs);
        let arr = getFilesRec('./');
        mock.restore();

        const baseDir = process.cwd();
        arr = arr.map((fileName) => (fileName.substring(baseDir.length)))

        expect(arr).toStrictEqual([
            "/.DS_Store",
            "/node_modules/module1/LICENSE",
            "/node_modules/module1/package.json",
            "/node_modules/module2/license",
            "/node_modules/module2/package.json",
            "/package.json",
            "/root.txt" 
        ]);
    });

    test('filter filters out specific files', () => {

        mock(fs);
        let arr = getFilesRec('./', (filename) => (filename.indexOf('package.json') > -1));
        mock.restore();

        const baseDir = process.cwd();
        arr = arr.map((fileName) => (fileName.substring(baseDir.length)))

        expect(arr).toStrictEqual([
            "/node_modules/module1/package.json",
            "/node_modules/module2/package.json",
            "/package.json",
        ]);
    });

});