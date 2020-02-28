use eosio::*;
use eosio_cdt::*;

pub mod dir;
pub mod token;

use dir::*;
use token::{getbalance, CurrencyStats};

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

fn getwinner(
   creq_id: u64
) -> u8 {
    //require_auth(voter);

    let _self = current_receiver();
    let vote_table = vote::table(_self, _self);


    let creq_vote = vote_table
        .find(creq_id);

    let symbol_code = eosio::Symbol::new(s!(4, "SYS"));
    let stats_table = CurrencyStats::table(_self, symbol_code);
    let cursor = stats_table
        .find(symbol_code)
        .expect("token with symbol does not exist, create token before issue");
    let mut st = cursor.get().expect("read");
    let issued_amount = st.max_supply.amount - st.supply.amount;

    let yes_vote_count: i64 = creq_vote.iter().filter_map(|x| x.get().ok())
                             .filter(|x| x.vote == true)
                             .map(|x| getbalance(
                                      x.voter,
                                      eosio::Symbol::new(s!(4, "SYS"))
                                  )
                             )
                             .sum();

    let no_vote_count: i64 = creq_vote.iter().filter_map(|x| x.get().ok())
                             .filter(|x| x.vote == false)
                             .map(|x| getbalance(
                                      x.voter,
                                      eosio::Symbol::new(s!(4, "SYS"))
                                  )
                             )
                             .sum();

    let total_votes = yes_vote_count + no_vote_count;
    if total_votes >= issued_amount/2 {
         if yes_vote_count > no_vote_count {
             1
         } else if yes_vote_count < no_vote_count {
             0
         } else {
            3
         }
    } else {
        4
    }
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

