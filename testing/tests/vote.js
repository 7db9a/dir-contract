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
const SEND_AMOUNT = '20.0000';

/*
    You should have running local nodeos in order to run tests
*/

describe('Vote', function () {
    // Increase mocha(testing framework) time, otherwise tests fails
    this.timeout(15000);

    let contract;
    let tokensIssuer;
    let tokensHolder;
    let tokenContract
    let tokenAccount
    let dir_id;
    let dir_name;
    let owner;
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
    });


    describe('Vote operations', function () {
        it('Should send EOS tokens, create dir contract with an entry and the receiver votes on entry.', async () => {
            let receiverAccount = await Account.createRandom();

            console.log("\ntokenAccount name:\n" + tokenAccount.name);
            console.log("receiverAccount name:\n" + receiverAccount.name);

            await tokenContract.transfer(tokenAccount.name, receiverAccount.name, SEND_AMOUNT + ' SYS', 'SYS')

            let receiverBalanceAfterSend = await receiverAccount.getBalance('SYS');
            assert(receiverBalanceAfterSend[0] == `${SEND_AMOUNT} SYS`, 'Incorrect tokens amount after send');

            // Vote setup
            contract = await eoslimeTool.Contract.deployOnAccount(DIR_WASM_PATH, DIR_ABI_PATH, receiverAccount);
            await contract.mkdir(receiverAccount.name, "dir");

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

            await snooze(snooze_ms);

            await contract.sendcreq(
                dir_id,
                "src/lib.rs",
                "QmcDsPV7QZFHKb2DNn8GWsU5dtd8zH5DNRa31geC63ceb1",
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

            // Vote

            await snooze(snooze_ms);

            await contract.voteoncreq(
                creq_id,
                receiverAccount.name,
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
    });
});
