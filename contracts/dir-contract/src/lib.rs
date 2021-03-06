use eosio::*;
use eosio_cdt::*;

pub mod dir;
pub mod token;

use dir::*;
use token::getbalance;

#[eosio::action]
pub fn voteoncreq(
   creq_id: u64,
   voter: AccountName,
   vote: bool,
) {
    //require_auth(voter);

    let _self = current_receiver();
    let creq_table = creq::table(_self, _self);
    let vote_table = vote::table(_self, _self);

    let balance = getbalance(
        voter,
        eosio::Symbol::new(s!(4, "SYS"))
    );

    // balance is of type i64;
    let amount = balance as u64;

    eosio_cdt::print!("account balance: ", balance);

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
        amount, // To be assigned according to token holdings.
    };

    vote_table.emplace(voter, &a_vote).check("write");
}

eosio_cdt::abi!(addfile, removefile, updatefile, sendcreq, voteoncreq);

#[eosio::table("vote")]
pub struct vote {
 #[eosio(primary_key)]
   vote_id: u64,
   creq_id: u64,
   voter: AccountName,
   vote: bool,
   amount: u64,
}

