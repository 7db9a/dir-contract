use eosio::*;
use eosio_cdt::*;
use PrimaryTableCursor as ptc;

#[eosio::action]
pub fn mkdir(
    owner: AccountName,
    dir_name: String,
) {

    require_auth(owner);

    let _self = current_receiver();
    let dirstbl = dirprofile::table(_self, _self);

    // Check if the owner already has a dir of the same name.
    let dir_count = dirstbl.iter().filter_map(|x| x.get().ok())
                             .filter(|x| x.owner == owner)
                             .filter(|x| x.dir_name == dir_name)
                             .count();
    check(dir_count == 0, "dir name already exists");

    let dir_id = dirstbl.available_primary_key().expect("failed to get primary key");


    let dir = dirprofile {
        dir_id,
        dir_name,
        owner,
    };

    dirstbl.emplace(owner, &dir).check("write");
}

#[eosio::action]
pub fn addfile(
    file_name: String,
    ipfs_hash: String,
    dir_id: u64,
    contributor: AccountName,
) {
    require_auth(contributor);

    let _self = current_receiver();
    let table = dirprofile::table(_self, _self);

    table
        .find(dir_id)
        .is_some()
        .check("dir doesn't exist");

    let table = dir::table(_self, _self);
    // Count how many files have the same name within the dir specified by the eosio method caller.
    let file_count = table.iter().filter_map(|x| x.get().ok())
                          .filter(|x| x.dir_id == dir_id)
                          .filter(|x| x.file_name == file_name)
                          .count();

    check(file_count == 0, "file name already exists");

    let file_id = table.available_primary_key().expect("failed to get primary key");

    let file = dir {
        file_id,
        file_name,
        ipfs_hash,
        dir_id,
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
pub fn sendcreq(
   dir_id: u64, 
   file_name: String,
   ipfs_hash: String,
   contributor: AccountName,
) {

    let _self = current_receiver();

    let creqtbl = creq::table(_self, _self);
    let proftbl = dirprofile::table(_self, _self);
    let dirtbl = dir::table(_self, _self);

    proftbl
        .find(dir_id)
        .is_some()
        .check("dir doesn't exist");

    // Does the file exist already?
    let entry = dirtbl.iter().filter_map(|x| x.get().ok())
                          .filter(|x| x.dir_id == dir_id)
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
        dir_id,
        contributor,
    };

    creqtbl.emplace(contributor, &creq).check("write");

}

eosio_cdt::abi!(mkdir, addfile, removefile, sendcreq);

#[eosio::table("dirprofile")]
pub struct dirprofile {
 #[eosio(primary_key)]
 dir_id: u64,
 dir_name: String,
 owner: AccountName,
}

#[eosio::table("dir")]
pub struct dir {
 #[eosio(primary_key)]
 file_id: u64,
 file_name: String,
 ipfs_hash: String,
 #[eosio(secondary_key)]
 dir_id: u64,
 last_contributor: AccountName,
}


#[eosio::table("creq")]
pub struct creq {
    #[eosio(primary_key)]
    creq_id: u64,
    file_name: String,
    ipfs_hash: String,
    #[eosio(secondary_key)]
    dir_id: u64,
    contributor: AccountName,

}
