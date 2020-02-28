use eosio::*;
use eosio_cdt::*;
use PrimaryTableCursor as ptc;

#[eosio::action]
pub fn addfile(
    file_name: String,
    ipfs_hash: String,
    contributor: AccountName,
) {
    require_auth(contributor);

    let _self = current_receiver();

    let table = dir::table(_self, _self);
    // Count how many files have the same name within the dir specified by the eosio method caller.
    let file_count = table.iter().filter_map(|x| x.get().ok())
                          .filter(|x| x.file_name == file_name)
                          .count();

    check(file_count == 0, "file name already exists");

    let file_id = table.available_primary_key().expect("failed to get primary key");

    let file = dir {
        file_id,
        file_name,
        ipfs_hash,
        last_contributor: contributor,
    };

    table.emplace(contributor, &file).check("write");
}

#[eosio::action]
pub fn removefile(
    file_id: u64,
    contributor: AccountName,
) {
    require_auth(contributor);

    let _self = current_receiver();
    let table = dir::table(_self, _self);

    let erase = |cursor: ptc<dir>| {cursor.erase().check("invalid index");};
    let unwind = || check(false, "file doesn't exist");

    // Remove the file or unwind the stack if the file can't be found.
    table
        .find(file_id)
        .map_or_else(|| unwind(), |cursor| erase(cursor) );
}

#[eosio::action]
pub fn updatefile(
    file_id: u64,
    new_ipfs_hash: String,
    contributor: AccountName,
) {
    require_auth(contributor);

    let _self = current_receiver();
    let table = dir::table(_self, _self);

    let cursor = table.find(file_id).expect("File not found");

    let mut file = cursor.get().expect("fail to read");

    file.ipfs_hash = new_ipfs_hash;
    file.last_contributor = contributor;

    cursor.modify(Payer::Same, file).expect("fail to write");
}

#[eosio::action]
pub fn sendcreq(
   file_name: String,
   ipfs_hash: String,
   contributor: AccountName,
) {

    let _self = current_receiver();

    let creqtbl = creq::table(_self, _self);
    let dirtbl = dir::table(_self, _self);

    // Does the file exist already?
    let entry = dirtbl.iter().filter_map(|x| x.get().ok())
                          .find(|x| x.file_name == file_name); // find short-circuits


    if let Some(x) = entry {
        let file_id = x.file_id;
    } else {
        let file_id = dirtbl.available_primary_key().expect("failed to get primary key");
    }

    //eosio::print!("file_id:\n{:#?}", file_id);

    let creq_id = creqtbl.available_primary_key().expect("failed to get primary key");

    let creq = creq {
        creq_id,
        file_name,
        ipfs_hash,
        contributor,
    };

    creqtbl.emplace(contributor, &creq).check("write");

}

#[eosio::table("dir")]
pub struct dir {
 #[eosio(primary_key)]
 file_id: u64,
 file_name: String,
 ipfs_hash: String,
 last_contributor: AccountName,
}


#[eosio::table("creq")]
pub struct creq {
    #[eosio(primary_key)]
    creq_id: u64,
    file_name: String,
    ipfs_hash: String,
    #[eosio(secondary_key)]
    contributor: AccountName,

}
