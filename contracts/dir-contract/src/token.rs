use eosio::*;
use eosio_token::*;
use eosio_numstr::{symbol_from_bytes, name_from_bytes};

pub fn get_balance(symbol: Symbol, holder: AccountName, issuer: AccountName) {
    ////let owner = name_from_bytes(owner.bytes()).unwrap();

    //let accts_table = Account::table(holder, issuer);

    //let accts_cursor = accts_table
    //    .find(symbol.code())
    //    .expect("Balance row already deleted or never existed. Action won't have any effect.");

    //let account = accts_cursor.get().expect("read");

    //assert!(
    //    account.balance.amount == 0,
    //    "Cannot close because the balance is not zero.",
    //);

    //account.balance.amount
}
