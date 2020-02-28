use eosio::*;
use eosio_cdt::*;
use eosio_numstr::{symbol_from_bytes, name_from_bytes};

#[derive(Read, Write, NumBytes, Copy, Clone)]
pub struct Account {
    pub balance: Asset,
}

impl Table for Account {
    const NAME: TableName = TableName::new(n!("accounts"));

    type Row = Self;

    fn primary_key(row: &Self::Row) -> u64 {
        row.balance.symbol.code().as_u64()
    }
}

#[derive(Read, Write, NumBytes, Copy, Clone)]
pub struct CurrencyStats {
    pub supply: Asset,
    pub max_supply: Asset,
    pub issuer: AccountName,
}

impl Table for CurrencyStats {
    const NAME: TableName = TableName::new(n!("stat"));

    type Row = Self;

    fn primary_key(row: &Self::Row) -> u64 {
        row.supply.symbol.code().as_u64()
    }
}

//#[eosio::action]
//pub fn balance(owner: AccountName, symbol: Symbol) {
//    let balance = getbalance(owner, symbol);
//    eosio_cdt::print!("account balance: ", balance);
//}

pub fn getbalance(owner: AccountName, symbol: Symbol) -> i64 {
    let code = eosio::AccountName::new(n!("eosio.token"));
    let accts_table = Account::table(code, owner);
    let accts_cursor = accts_table
        .find(symbol.code())
        .expect("Balance row already deleted or never existed. Action won't have any effect.");
    let account = accts_cursor.get().expect("read");

    account.balance.amount
}
