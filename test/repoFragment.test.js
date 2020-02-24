const { repoFragmentToUrl } = require('../lisense');

describe('function repoFragmentToUrl', () => {

    test('should be null for input null', () => {
        expect(repoFragmentToUrl(null)).toBe(null);
    });

    test('should be null for empty object', () => {
        expect(repoFragmentToUrl({})).toBe(null);
    });

    test('should be null for string', () => {
        expect(repoFragmentToUrl('hello world')).toBe(null);
    });

    test('should handle non-git urls to null', () => {
        expect(repoFragmentToUrl({
            type: 'git',
            url: 'https://www.google.de/'
        })).toBe(null);
    });

    test('should handle also if only url contains git', () => {
        expect(repoFragmentToUrl({
            type: '',
            url: 'git://github.com/mikeal/watch.git'
        })).toBe('https://github.com/mikeal/watch');
    });

    test('should recognize correct repo object', () => {
        expect(repoFragmentToUrl({
            type: 'git',
            url: 'git://github.com/mikeal/watch.git'
        })).toBe('https://github.com/mikeal/watch');
    });

    test('should extract repo url from git+ notation', () => {
        expect(repoFragmentToUrl({
            type: 'git',
            url: 'git+http://github.com/mikeal/watch.git'
        })).toBe('https://github.com/mikeal/watch');
    });

    test('should handle .git url extension', () => {
        expect(repoFragmentToUrl({
            type: 'git',
            url: 'git+ssh://github.com/mikeal/watch.git'
        })).toBe('https://github.com/mikeal/watch');
    });
});