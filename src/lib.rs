use eosio::*;
use eosio_cdt::*;

pub mod dir;

use dir::*;

#[eosio::action]
pub fn voteoncreq(
   creq_id: u64,
   voter: AccountName,
) {
    let _self = current_receiver();
    let creq_table = creq::table(_self, _self);
    let vote_table = vote::table(_self, _self);

    creq_table
        .find(creq_id)
        .is_some()
        .check("change request doesn't exist");

    let vote_id = vote_table.available_primary_key().expect("failed to get primary key");

    let a_vote = vote {
        vote_id,
        creq_id,
        voter,
        vote: 1,
    };

    vote_table.emplace(voter, &a_vote).check("write");
}

eosio_cdt::abi!(mkdir, addfile, removefile, sendcreq, voteoncreq);

#[eosio::table("vote")]
pub struct vote {
 #[eosio(primary_key)]
   vote_id: u64,
   creq_id: u64,
   voter: AccountName,
   vote: u64,
}
