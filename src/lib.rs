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

#[eosio::table("vote")]
pub struct vote {
 #[eosio(primary_key)]
   vote_id: u64,
   creq_id: u64,
   voter: AccountName,
   vote: u64,
}
