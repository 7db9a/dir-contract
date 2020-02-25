const assert = require('assert');
const eoslime = require('./../eoslime');
const eoslimeTool = eoslime.init();

const Account = eoslimeTool.Account;
const Provider = eoslimeTool.Provider;

const DIR_WASM_PATH = '../../../project/dircontract_gc_opt.wasm';
const DIR_ABI_PATH =  '../../../project/contracts/dir-contract/dircontract.abi.json';
const TOKEN_ABI_PATH = '../../../project/contracts/eosio_token/eosio_token.abi.json';
const TOKEN_WASM_PATH = '../../../project/eosio_token_gc.wasm';
const TOTAL_SUPPLY = '1000000000.0000 SYS';

/*
    You should have running local nodeos in order to run tests
*/

async function convert_eos_token_amount(eosio_amount) {
    return eosio_amount/10000;
}

describe('Vote', function () {
    // Increase mocha(testing framework) time, otherwise tests fails
    this.timeout(15000);

    var contract;
    var tokensIssuer;
    var tokensHolder;
    var tokenContract;
    var tokenAccount;
    var receiverAccount;
    var dir_id;
    var dir_name;
    var owner;
    var snooze_ms = 300;

    // We call this at the top of each test case, otherwise nodeosd could
    // throw duplication errors (ie, data races).
    const snooze = ms => new Promise(resolve => setTimeout(resolve, ms));

    before(async () => {
        // Creates eosio.token account if you don't have it
        tokenAccount = await Account.createFromName('eosio.token');
        tokenContract = await eoslimeTool.Contract.deployOnAccount(TOKEN_WASM_PATH, TOKEN_ABI_PATH, tokenAccount);
        await tokenContract.create(tokenAccount.name, TOTAL_SUPPLY);
        await tokenContract.issue(tokenAccount.name, TOTAL_SUPPLY, 'memo');
        console.log("\ntokenAccount name:\n" + tokenAccount.name);
    });


    describe('Vote operations', function () {
        async function createRandomUser(
            send_amount
        ) {
            receiverAccount = await Account.createRandom();
            console.log("receiverAccount name:\n" + receiverAccount.name);
            if (send_amount > '0.0000') {
                await tokenContract.transfer(tokenAccount.name, receiverAccount.name, send_amount + ' SYS', 'SYS')
                let receiverBalanceAfterSend = await receiverAccount.getBalance('SYS');
                assert(receiverBalanceAfterSend[0] == `${send_amount} SYS`, 'Incorrect tokens amount after send');
            }

            return receiverAccount
        };

        beforeEach(async() => {
            receiverAccount = await createRandomUser('20.0000');
        });

        async function voteSetup(
            contract,
            receiverAccount,
            fileName,
            fileHash,
            snoozeMs
        ) {
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

            await snooze(snoozeMs);

            await contract.sendcreq(
                dir_id,
                fileName,
                fileHash,
                receiverAccount.name,
            );

            let creq_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "creq",
                json: true
            });

            let creq_id = creq_tbl["rows"][0]["creq_id"];

            assert.equal(creq_id, 0, "Wrong change request id.");

            return [contract, creq_id]
        };

        async function vote_change_request(contract, creqId, approve) {
            await contract.voteoncreq(
                creqId,
                receiverAccount.name,
                approve,
            );

            var vote_tbl = await contract.provider.eos.getTableRows({
                code: contract.name,
                scope: contract.name,
                table: "vote",
                json: true
            });

            function count(obj) { return Object.keys(obj).length; }

            var vote_count = count(vote_tbl["rows"]);

            var warning_tbl_length = "Wrong number of votes: " + vote_count;

            var vote_creq_id = vote_tbl["rows"][0]["creq_id"];
            var vote = vote_tbl["rows"][0]["vote"];
            var vote_amount = vote_tbl["rows"][0]["amount"];
            return [vote, vote_amount, vote_creq_id, vote_count, warning_tbl_length]
        };

        it('Should vote on entry.', async () => {
            var contract = await eoslimeTool.Contract.deployOnAccount(DIR_WASM_PATH, DIR_ABI_PATH, receiverAccount);
            await contract.mkdir(receiverAccount.name, "dir");
            let vote_setup_res = await voteSetup(
                contract,
                receiverAccount,
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                snooze_ms
            );

            contract = vote_setup_res[0];
            let creq_id = vote_setup_res[1];

            await snooze(snooze_ms);

            // Vote

            vote_res = await vote_change_request(contract, creq_id, 1);

            vote = vote_res[0];
            vote_amount = vote_res[1];
            vote_creq_id = vote_res[2];
            vote_count = vote_res[3];
            warning_tbl_length = vote_res[4];

            let vote_amount_convert = await convert_eos_token_amount(vote_amount);

            assert.equal(vote_count, 1, warning_tbl_length);
            assert.equal(creq_id, vote_creq_id, "The vote table doesn't have the right change request ID.");
            assert.equal(vote, 1, "Voted '1' for 'yes'" );
            assert.equal(vote_amount_convert, '20.0000');
        });

        it('Should add a no vote to a change request', async () => {
            var contract = await eoslimeTool.Contract.deployOnAccount(DIR_WASM_PATH, DIR_ABI_PATH, receiverAccount);
            await contract.mkdir(receiverAccount.name, "dir");
            let vote_setup_res = await voteSetup(
                contract,
                receiverAccount,
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                snooze_ms
            );

            contract = vote_setup_res[0];
            let creq_id = vote_setup_res[1];

            await snooze(snooze_ms);

            // Vote

            vote_res = await vote_change_request(contract, creq_id, 0);

            vote = vote_res[0];
            vote_amount = vote_res[1];
            vote_creq_id = vote_res[2];
            vote_count = vote_res[3];
            warning_tbl_length = vote_res[4];

            let vote_amount_convert = await convert_eos_token_amount(vote_amount);

            assert.equal(vote_count, 1, warning_tbl_length);
            assert.equal(creq_id, vote_creq_id, "The vote table doesn't have the right change request ID.");
            assert.equal(vote, 0, "Voted '0' for 'no'" );
            assert.equal(vote_amount_convert, '20.0000');
        });

        it('Should not add duplicate vote for a change request', async () => {
            var contract = await eoslimeTool.Contract.deployOnAccount(DIR_WASM_PATH, DIR_ABI_PATH, receiverAccount);
            await contract.mkdir(receiverAccount.name, "dir");
            let vote_setup_res = await voteSetup(
                contract,
                receiverAccount,
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                snooze_ms
            );

            contract = vote_setup_res[0];
            let creq_id = vote_setup_res[1];

            await snooze(snooze_ms);

            // Vote

            vote_res = await vote_change_request(contract, creq_id, 0);

            await snooze(snooze_ms);

            //Voting again is not allowed!
            try {
                await vote_change_request(contract, creq_id, 0);
             } catch (error) {
                     err_json = JSON.parse(error);
                     err_code = err_json.code;
                     if (err_code == 500) {
                         eosio_err_code = err_json.error.code;
                         eosio_err_name = err_json.error.name;
                     }
             }

            vote = vote_res[0];
            vote_amount = vote_res[1];
            vote_creq_id = vote_res[2];
            vote_count = vote_res[3];
            warning_tbl_length = vote_res[4];

            let vote_amount_convert = await convert_eos_token_amount(vote_amount);

            assert.equal(vote_count, 1, warning_tbl_length);
            assert.equal(creq_id, vote_creq_id, "The vote table doesn't have the right change request ID.");
            assert.equal(vote, 0, "Voted '0' for 'no'" );
            assert.equal(vote_amount_convert, '20.0000');

            // If we get a 409, it likely means the two contract calls were seen as duplicates
            // by nodeos. Basically a data race. Consider sleeping for a few ms in between
            // contract calls. Search the web for "nodejs async sleep".
            assert.equal(err_code, 500, "Instead of an Internal Appliation Error, we got: " + err_json);
            assert.equal(eosio_err_code, 3050003, "Duplicate vote.");
            assert.equal(eosio_err_name, "eosio_assert_message_exception", "Duplicate vote.");
        });

        it('Should allow two users to vote on the same entry.', async () => {
            var contract = await eoslimeTool.Contract.deployOnAccount(DIR_WASM_PATH, DIR_ABI_PATH, receiverAccount);
            await contract.mkdir(receiverAccount.name, "dir");
            var vote_setup_res = await voteSetup(
                contract,
                receiverAccount,
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
                snooze_ms
            );

            contract = vote_setup_res[0];
            var creq_id = vote_setup_res[1];

            await snooze(snooze_ms);

            // Vote

            vote_res = await vote_change_request(contract, creq_id, 1);

            vote = vote_res[0];
            vote_amount = vote_res[1];
            vote_creq_id = vote_res[2];
            vote_count = vote_res[3];
            warning_tbl_length = vote_res[4];

            var vote_amount_convert = await convert_eos_token_amount(vote_amount);

            assert.equal(vote_count, 1, warning_tbl_length);
            assert.equal(creq_id, vote_creq_id, "The vote table doesn't have the right change request ID.");
            assert.equal(vote, 1, "Voted '1' for 'yes'" );
            assert.equal(vote_amount_convert, '20.0000');

            // Second user

            receiverAccount = await createRandomUser('20.0000');
            contract = await eoslimeTool.Contract.at(contract.name, receiverAccount);

            await snooze(snooze_ms);

            //// Vote

            vote_res = await vote_change_request(contract, creq_id, 1);

            vote = vote_res[0];
            vote_amount = vote_res[1];
            vote_creq_id = vote_res[2];
            vote_count = vote_res[3];
            warning_tbl_length = vote_res[4];

            vote_amount_convert = await convert_eos_token_amount(vote_amount);

            assert.equal(vote_count, 2, warning_tbl_length);
            assert.equal(creq_id, vote_creq_id, "The vote table doesn't have the right change request ID.");
            assert.equal(vote, 1, "Voted '1' for 'yes'" );
            assert.equal(vote_amount_convert, '20.0000');
        });
    });
});
