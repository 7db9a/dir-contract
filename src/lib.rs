use eosio::*;
use eosio_cdt::*;

pub mod dir;

use dir::*;

#[eosio::action]
pub fn voteoncreq(
   creq_id: u64,
   voter: AccountName,
) {
    require_auth(voter);

    let _self = current_receiver();
    let table = creq::table(_self, _self);

    table
        .find(creq_id)
        .is_some()
        .check("change request doesn't exist");

    let table = vote::table(_self, _self);

    let vote_id = table.available_primary_key().expect("failed to get primary key");

    let a_vote = vote {
        vote_id,
        creq_id,
        voter,
        vote: 1,
    };

    table.emplace(voter, &a_vote).check("write");
}

#[eosio::table("vote")]
pub struct vote {
 #[eosio(primary_key)]
   vote_id: u64,
   creq_id: u64,
   voter: AccountName,
   vote: u64,
}
