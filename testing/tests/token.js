const assert = require('assert');
const eoslime = require('./../eoslime');
const eoslimeTool = eoslime.init();

const Account = eoslimeTool.Account;
const Provider = eoslimeTool.Provider;

/*
    You should have running local nodeos in order to run tests
*/

describe('Tokens', function () {
    // Increase mocha(testing framework) time, otherwise tests fails
    this.timeout(15000);

    describe('Send tokens', function () {
        it('Should send EOS tokens', async () => {

            const TOKEN_ABI_PATH = './eosio_token.abi.json';
            const TOKEN_WASM_PATH = '../../../project/eosio_token_gc.wasm';
            const TOTAL_SUPPLY = '1000000000.0000 SYS';

            // Creates eosio.token account if you don't have it
            const tokenAccount = await Account.createFromName('eosio.token');
            const tokenContract = await eoslimeTool.Contract.deployOnAccount(TOKEN_WASM_PATH, TOKEN_ABI_PATH, tokenAccount);
            await tokenContract.create(tokenAccount.name, TOTAL_SUPPLY);
            await tokenContract.issue(tokenAccount.name, TOTAL_SUPPLY, 'memo');
            const SEND_AMOUNT = '10.0000';

            let receiverAccount = await Account.createRandom();

            console.log("\ncontract name:\n" + tokenContract.name);
            console.log("receiverAccount name:\n" + receiverAccount.name);

            await tokenContract.transfer(tokenAccount.name, receiverAccount.name, SEND_AMOUNT + ' SYS', 'SYS')

            let receiverBalanceAfterSend = await receiverAccount.getBalance('SYS');
            assert(receiverBalanceAfterSend[0] == `${SEND_AMOUNT} SYS`, 'Incorrect tokens amount after send');
        });
    });
});
