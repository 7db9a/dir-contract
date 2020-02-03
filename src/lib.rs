use eosio::*;
use eosio_cdt::*;

pub mod dir;

use dir::*;

#[eosio::action]
pub fn voteoncreq(
   creq_id: u64,
   voter: AccountName,
) {
}
