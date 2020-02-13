use eosio::*;
use eosio_cdt::*;

pub mod dir;
pub mod token;

use dir::*;
use token::*;

#[eosio::action]
pub fn voteoncreq(
   creq_id: u64,
   voter: AccountName,
   vote: bool,
) {
    require_auth(voter);

    let _self = current_receiver();
    let creq_table = creq::table(_self, _self);
    let vote_table = vote::table(_self, _self);

    creq_table
        .find(creq_id)
        .is_some()
        .check("change request doesn't exist");

    let duplicate_vote_count = vote_table.iter().filter_map(|x| x.get().ok())
                             .filter(|x| x.creq_id == creq_id)
                             .filter(|x| x.voter == voter)
                             .count();

    check(duplicate_vote_count == 0, "duplicate vote");

    let vote_id = vote_table.available_primary_key().expect("failed to get primary key");

    let a_vote = vote {
        vote_id,
        creq_id,
        voter,
        vote,
        amount: 100, // To be assigned according to token holdings.
    };

    vote_table.emplace(voter, &a_vote).check("write");
}

#[eosio::action]
pub fn getbalance(symbol: String, holder: String) {
    token::get_balance(symbol, holder)
}

eosio_cdt::abi!(mkdir, addfile, removefile, sendcreq, voteoncreq, getbalance);

#[eosio::table("vote")]
pub struct vote {
 #[eosio(primary_key)]
   vote_id: u64,
   creq_id: u64,
   voter: AccountName,
   vote: bool,
   amount: u64,
}
