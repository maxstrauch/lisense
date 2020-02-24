const { system } = require('../lisense');


describe('function system', () => {

    test('should work for a common command (ls)', async () => {

        const ret = await system('ls', ['-lah']);

        expect(ret.code).toBe(0);
        expect(ret.stdout.length > 0).toBe(true);
        expect(ret.stderr.length < 1).toBe(true);
        expect(ret.out).toBe(ret.stdout);
    });

    test('should return non-zero exit code for invalid commands', async () => {

        const ret = await system('ls', ['-lah', '/imaginary/directory/foo42']);

        expect(ret.code !== 0).toBe(true);
    })

});