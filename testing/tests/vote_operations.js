const assert = require('assert');
const eoslime = require('./../eoslime').init();

const TOKEN_WASM_PATH = '../../../project/dircontract_gc_opt.wasm';
const TOKEN_ABI_PATH =  '../../../project/contracts/dir-contract/dircontract.abi.json';

describe('Basic operations', function () {

    // Increase mocha(testing framework) time, otherwise tests fails
    this.timeout(15000);

    let contract;
    let tokensIssuer;
    let tokensHolder;
    let dir_id;
    let dir_name;
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

        let dirprofile_tbl = await contract.provider.eos.getTableRows({
            code: contract.name,
            scope: contract.name,
            table: "dirprofile",
            json: true
        });

        dir_id = dirprofile_tbl["rows"][0]["dir_id"];
        dir_name = dirprofile_tbl["rows"][0]["dir_name"];
        owner = dirprofile_tbl["rows"][0]["owner"];

        assert.equal(dir_id, 0, "Wrong dir id.");
        assert.equal(dir_name, "dir", "Wrong dir name.");
        assert.equal(owner, contract.executor.name, "Wrong dir owner.");

    });

    describe('Vote on change Request', function () {
        it('Should add a yes vote to a change request', async () => {

            // Setup

            await snooze(snooze_ms);

            await contract.sendcreq(
                dir_id,
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

            // Vote

            await snooze(snooze_ms);

            await contract.voteoncreq(
                creq_id,
                contract.executor.name,
                1,
            );

            let vote_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "vote",
                json: true
            });


            function count(obj) { return Object.keys(obj).length; }

            let vote_tbl_length = count(vote_tbl);

            let warning_tbl_length = "Wrong number of votes: " + vote_tbl_length;

            let vote_creq_id = vote_tbl["rows"][0]["creq_id"];
            let vote = vote_tbl["rows"][0]["vote"];
            let vote_amount = vote_tbl["rows"][0]["amount"];

            assert.equal(vote_tbl_length, 2, warning_tbl_length);
            assert.equal(creq_id, vote_creq_id, "The vote table doesn't have the right change request ID.");
            assert.equal(vote, 1, "Voted '1' for 'yes'" );
            assert.equal(vote_amount, 100, "Wrong voting power." );
        });
        it('Should add a no vote to a change request', async () => {

            // Setup

            await snooze(snooze_ms);

            await contract.sendcreq(
                dir_id,
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

            // Vote

            await snooze(snooze_ms);

            await contract.voteoncreq(
                creq_id,
                contract.executor.name,
                0,
            );

            let vote_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "vote",
                json: true
            });


            function count(obj) { return Object.keys(obj).length; }

            let vote_tbl_length = count(vote_tbl);

            let warning_tbl_length = "Wrong number of votes: " + vote_tbl_length;

            let vote_creq_id = vote_tbl["rows"][0]["creq_id"];
            let vote = vote_tbl["rows"][0]["vote"];
            let vote_amount = vote_tbl["rows"][0]["amount"];

            assert.equal(vote_tbl_length, 2, warning_tbl_length);
            assert.equal(creq_id, vote_creq_id, "The vote table doesn't have the right change request ID.");
            assert.equal(vote, 0, "Voted '0' for 'no'" );
            assert.equal(vote_amount, 100, "Wrong voting power." );
        });
        it('Should not add duplicate vote for a change request', async () => {

            // Setup

            await snooze(snooze_ms);

            await contract.sendcreq(
                dir_id,
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

            // Vote

            await snooze(snooze_ms);

            await contract.voteoncreq(
                creq_id,
                contract.executor.name,
                0,
            );

            await snooze(snooze_ms);

           try {
               await contract.voteoncreq(
                     creq_id,
                     contract.executor.name,
                     0,
                 );
            } catch (error) {
                    err_json = JSON.parse(error);
                    err_code = err_json.code;
                    if (err_code == 500) {
                        eosio_err_code = err_json.error.code;
                        eosio_err_name = err_json.error.name;
                    }
            }
            let vote_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "vote",
                json: true
            });


            function count(obj) { return Object.keys(obj).length; }

            let vote_tbl_length = count(vote_tbl);

            let warning_tbl_length = "Wrong number of votes: " + vote_tbl_length;

            let vote_creq_id = vote_tbl["rows"][0]["creq_id"];
            let vote = vote_tbl["rows"][0]["vote"];
            let vote_amount = vote_tbl["rows"][0]["amount"];

            assert.equal(vote_tbl_length, 2, warning_tbl_length);
            assert.equal(creq_id, vote_creq_id, "The vote table doesn't have the right change request ID.");
            assert.equal(vote, 0, "Voted '0' for 'no'" );
            assert.equal(vote_amount, 100, "Wrong voting power." );

            // If we get a 409, it likely means the two contract calls were seen as duplicates
            // by nodeos. Basically a data race. Consider sleeping for a few ms in between
            // contract calls. Search the web for "nodejs async sleep".
            assert.equal(err_code, 500, "Instead of an Internal Appliation Error, we got: " + err_json);
            assert.equal(eosio_err_code, 3050003, "Duplicate vote.");
            assert.equal(eosio_err_name, "eosio_assert_message_exception", "Duplicate vote.");
        });
    })
});
