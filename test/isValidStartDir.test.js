const { isValidStartDir } = require('../lisense');

const mock = require('mock-fs');

const fs = {
    './good': {
        'node_modules': {
            'module1': {
                'package.json': JSON.stringify({ name: 'module1', version: '1.0.0', license: 'MIT' }),
                'LICENSE': 'this is a license',
            },
            'module2': {
                'package.json': JSON.stringify({ name: 'module2', version: '1.0.0' }),
                'license': 'this is a license',
            },
        },
        'package.json': JSON.stringify({ name: 'app', version: '1.0.0' }),
        'root.txt': 'Inside the rootdir only!',
        '.DS_Store': Buffer.from([0xaa, 0xff, 0x20]),
    },
    './no-packjson': {
        'node_modules': {
        },
        'root.txt': 'Inside the rootdir only!',
    },
    './packjson-dir': {
        'package.json': {
            'root.txt': 'Inside the package.json only!',
        },
    },
    './nodemods-file': {
        'package.json': JSON.stringify({ name: 'app', version: '1.0.0' }),
        'node_modules': 'This is no directory'
    },
    './nodemods-empty': {
        'node_modules': { },
        'package.json': JSON.stringify({ name: 'app', version: '1.0.0' }),
    }
};

describe('function isValidStartDir', () => {

    beforeEach(() => {
        mock(fs);
    });

    afterEach(() => {
        mock.restore();
    });

    test('should return false if invalid path', () => {
        expect(isValidStartDir('a_not_existing_dir')).toBe(false);
    });

    test('should return true normally if correct', () => {
        expect(isValidStartDir('./good')).toBe(true);
    });

    test('should not accept files', () => {
        expect(isValidStartDir('./good/root.txt')).toBe(false);
    });

    test('should not accept directory without package.json', () => {
        expect(isValidStartDir('./no-packjson')).toBe(false);
    });

    test('should not accept directory with package.json directory', () => {
        expect(isValidStartDir('./packjson-dir')).toBe(false);
    });

    test('should not accept directory with file node_modules', () => {
        expect(isValidStartDir('./nodemods-file')).toBe(false);
    });

    test('should not accept empty node_modules directory', () => {
        expect(isValidStartDir('./nodemods-empty')).toBe(false);
    });
    
});