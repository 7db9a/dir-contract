use eosio::*;
use eosio_cdt::*;
use PrimaryTableCursor as ptc;


#[eosio::action]
pub fn voteoncreq(
   creq_id: u64, 
   voter: AccountName,
) {
}
