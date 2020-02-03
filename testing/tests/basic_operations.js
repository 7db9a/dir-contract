const assert = require('assert');
const eoslime = require('./../eoslime').init();

const TOKEN_WASM_PATH = '../../project/dircontract_gc_opt.wasm';
const TOKEN_ABI_PATH =  '../../project/dircontract.abi.json';

describe('Basic operations', function () {

    // Increase mocha(testing framework) time, otherwise tests fails
    this.timeout(15000);

    let contract;
    let tokensIssuer;
    let tokensHolder;
    let repo_id;
    let repo_name;
    let owner;
    var snooze_ms = 300;

    // We call this at the top of each test case, otherwise nodeosd could
    // throw duplication errors (ie, data races).
    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

    before(async () => {
        /*
            Accounts loader generates random accounts for easier testing But you could use it also to create new accounts on each network
            For more details, visit the documentation
        */
        //let accounts = await eoslime.Account.createRandoms(2);
        //tokensIssuer = accounts[0];
        //tokensHolder = accounts[1];
    });

    beforeEach(async () => {
        /*
            CleanDeployer creates for you a new account behind the scene
            on which the contract code is deployed

            Note! CleanDeployer always deploy the contract code on a new fresh account

            You can access the contract account as -> contract.executor
        */
        contract = await eoslime.CleanDeployer.deploy(TOKEN_WASM_PATH, TOKEN_ABI_PATH);
        await contract.mkdir(contract.executor.name, "dir");

        let repoprofile_tbl = await contract.provider.eos.getTableRows({
            code: contract.name,
            scope: contract.name,
            table: "repoprofile",
            json: true
        });

        repo_id = repoprofile_tbl["rows"][0]["repo_id"];
        repo_name = repoprofile_tbl["rows"][0]["repo_name"];
        owner = repoprofile_tbl["rows"][0]["owner"];

        assert.equal(repo_id, 0, "Wrong repo id.");
        assert.equal(repo_name, "dir", "Wrong repo name.");
        assert.equal(owner, contract.executor.name, "Wrong repo owner.");

    });

    it("An account shouldn't be able to own two repos with the same name", async () => {
        await snooze(snooze_ms);

        var err_json;
        var err_code;
        var eosio_err_code;
        var eosio_err_name;

        try {
            await contract.mkdir(contract.executor.name, "dir");
        } catch (error) {
                err_json = JSON.parse(error);
                err_code = err_json.code;
                if (err_code == 500) {
                    eosio_err_code = err_json.error.code;
                    eosio_err_name = err_json.error.name;
                }
        }

        // If we get a 409, it likely means the two contract calls were seen as duplicates
        // by nodeos. Basically a data race. Consider sleeping for a few ms in between
        // contract calls. Search the web for "nodejs async sleep".
        assert.equal(err_code, 500, "Instead of an Internal Appliation Error, we got: " + err_json);
        assert.equal(eosio_err_code, 3050003, "Two repos with same name are owned by a single account.");
        assert.equal(eosio_err_name, "eosio_assert_message_exception", "Two repos with same name are owned by a single account.");
    });

    describe('Add files', function () {
       it('Should add a file to a repo', async () => {
           await snooze(snooze_ms);

           await contract.addfile(
               "src/lib.rs",
               "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
               repo_id,
               contract.executor.name,
           );

           let repo_tbl = await contract.provider.eos.getTableRows({
               code: contract.name,
               scope: contract.name,
               table: "repo",
               json: true
           });

           let file_id = repo_tbl["rows"][0]["file_id"];


           assert.equal(file_id, 0, "Wrong file id.");
           assert.equal(repo_name, "dir", "Wrong repo name.");
           assert.equal(owner, contract.executor.name, "Wrong repo owner.");
       });

       it("A repo shouldn't be able to have duplicate file names", async () => {
           await snooze(snooze_ms);

           var err_json;
           var err_code;
           var eosio_err_code;
           var eosio_err_name;

           await contract.addfile(
               "src/lib.rs",
               "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
               repo_id,
               contract.executor.name,
           );

           await snooze(snooze_ms);

           try {
              await contract.addfile(
                  "src/lib.rs",
                  "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                  repo_id,
                  contract.executor.name,
              );
           } catch (error) {
                   err_json = JSON.parse(error);
                   err_code = err_json.code;
                   if (err_code == 500) {
                       eosio_err_code = err_json.error.code;
                       eosio_err_name = err_json.error.name;
                   }
           }

           // If we get a 409, it likely means the two contract calls were seen as duplicates
           // by nodeos. Basically a data race. Consider sleeping for a few ms in between
           // contract calls. Search the web for "nodejs async sleep".
           assert.equal(err_code, 500, "Instead of an Internal Appliation Error, we got: " + err_json);
           assert.equal(eosio_err_code, 3050003, "Two repos with same name are owned by a single account.");
           assert.equal(eosio_err_name, "eosio_assert_message_exception", "Two repos with same name are owned by a single account.");

       });

       it('Should not be able to make more than 10 consecutive addfile calls (nodeos caps pushing more than 10 quickly in a row?)', async () => {
            for (file = 0; file < 12; file++) {
                await snooze(snooze_ms);
                await contract.addfile(
                    file.toString(),
                    file.toString(),
                    repo_id,
                    contract.executor.name,
                );
            }

           let repo_tbl = await contract.provider.eos.getTableRows({
               code: contract.name,
               scope: contract.name,
               table: "repo",
               json: true
           });

           function count(obj) { return Object.keys(obj).length; }

           assert.equal(count(repo_tbl["rows"]), 10, "There are more files in the repo than there should.");
       });
    });

    describe('Remove files', function () {
        it('Should remove a file from a repo', async () => {
            await snooze(snooze_ms);

            await contract.addfile(
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                repo_id,
                contract.executor.name,
            );

            await snooze(snooze_ms);
            var repo_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "repo",
                json: true
            });

            let file_id = repo_tbl["rows"][0]["file_id"];

            await snooze(snooze_ms);

            await contract.removefile(
                file_id,
                contract.executor.name,
            );

            await snooze(snooze_ms);

            repo_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "repo",
                json: true
            });

            assert.equal(repo_tbl["rows"][0], undefined, "Wrong file id.");
        });

        it('Should remove all files from a repo that has many files', async () => {
            for (file = 0; file < 10; file++) {
                await snooze(snooze_ms);
                await contract.addfile(
                    file.toString(),
                    file.toString(),
                    repo_id,
                    contract.executor.name,
                );
            }

            for (file_id = 0; file_id < 10; file_id++) {
                await snooze(snooze_ms);
                await contract.removefile(
                    file_id,
                    contract.executor.name,
                );
            }

            let repo_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "repo",
                json: true
            });

            function count(obj) { return Object.keys(obj).length; }

            assert.equal(count(repo_tbl["rows"]), 0, "Didn't delete all 10 files in the repo");
        });

        // Say we have files with IDs 0, 1, 2, 3. If 0, 1, and 3 are deleted, there should still
        // be a file with the file ID 2. So if a file is then added, it will have a file ID of 3.
        it('Removing all files from a repo but one that is not at index 0 should not reset the file ID count.', async () => {
            for (file = 0; file < 3; file++) {
                await snooze(snooze_ms);
                await contract.addfile(
                    file.toString(),
                    file.toString(),
                    repo_id,
                    contract.executor.name,
                );
            }

            // Remove all files except the 2nd one.
            for (file_id = 0; file_id < 3; file_id++) {
                await snooze(snooze_ms);
                if (file_id != 2) {
                    await contract.removefile(
                        file_id,
                        contract.executor.name,
                    );
                }
            }


            await snooze(snooze_ms);

            // This new file should have a file ID of 3, not 1. Again, index starts at 0.
            // File IDs 0, 1, 2, and 4 were deleted above. The 2nd remains, so adding this
            // file results in file ID 3.
            await contract.addfile(
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                repo_id,
                contract.executor.name,
            );

            await snooze(snooze_ms);

            let repo_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "repo",
                json: true
            });

            function count(obj) { return Object.keys(obj).length; }

            assert.equal(repo_tbl["rows"][0]["file_id"], 2, "The repo table's file ID index was reset, or something.");
            assert.equal(repo_tbl["rows"][1]["file_id"], 3, "The rpos table's file index was reset, or something.");
            assert.equal(count(repo_tbl["rows"]), 2, "There are more files in the repo than there should.");

        });
    });

    describe('Send change Request', function () {
        it('Should send a change request', async () => {
            await snooze(snooze_ms);

            await contract.sendcreq(
                repo_id,
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                contract.executor.name,
            );

            let creq_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "creq",
                json: true
            });

            let creq_id = creq_tbl["rows"][0]["creq_id"];


            assert.equal(creq_id, 0, "Wrong change request id.");
        });

        it('Should not be able to make more than 10 consecutive change requests (nodeos caps pushing more than 10 quickly in a row?)', async () => {
            await snooze(snooze_ms);

            for (file = 0; file < 11; file++) {
                await snooze(snooze_ms);
                await contract.sendcreq(
                    repo_id,
                    file.toString(),
                    file.toString(),
                    contract.executor.name,
                );
            }

            await snooze(snooze_ms);

            let creq_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "creq",
                json: true
            });

            function count(obj) { return Object.keys(obj).length; }

            assert.equal(count(creq_tbl["rows"]), 10, "Nodeos let an account do more than 10 consecutive actions?");
        });

        it('change requests sent to 2 different repos should globally increment change request IDs', async () => {
            await snooze(snooze_ms);

            await contract.sendcreq(
                repo_id,
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                contract.executor.name,
            );

            await snooze(snooze_ms);
            await contract.mkdir(contract.executor.name, "2ndRepo");

            await snooze(snooze_ms);
            await contract.sendcreq(
                1, // refers to "2ndRepo" (index starts at 0)
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                contract.executor.name,
            );

            let creq_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "creq",
                json: true
            });

            function count(obj) { return Object.keys(obj).length; }

            assert.equal(count(creq_tbl["rows"]), 2, "change requests from another repo isn't globally incrementing PR IDs.");
        });

        it('Should send two consecutive change request on an existing file', async () => {
            await snooze(snooze_ms);

            // Adding a file to a repo.
            await contract.addfile(
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                repo_id,
                contract.executor.name,
            );

            await snooze(snooze_ms);

            // Sending a change request to change the file added above.
            await contract.sendcreq(
                repo_id,
                "src/lib.rs",
                "QmcRg8D4QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63g5c2",
                contract.executor.name,
            );

            await snooze(snooze_ms);

            await contract.sendcreq(
                repo_id,
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                contract.executor.name,
            );

            let creq_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "creq",
                json: true
            });

            let creq_id_0 = creq_tbl["rows"][0]["creq_id"];
            let creq_id_1 = creq_tbl["rows"][1]["creq_id"];

            function count(obj) { return Object.keys(obj).length; }

            let creq_tbl_length = count(creq_tbl);

            let warning_tbl_length = "Wrong number of change requests: " + creq_tbl_length;

            assert.equal(creq_id_0, 0, "Wrong change request id.");
            assert.equal(creq_id_1, 1, "Wrong change request id.");
            assert.equal(creq_tbl_length, 2, warning_tbl_length);
        });
    })
});
