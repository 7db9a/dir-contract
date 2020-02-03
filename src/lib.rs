use eosio::*;
use eosio_cdt::*;
use PrimaryTableCursor as ptc;

#[eosio::action]
fn mkdir(
    owner: AccountName,
    repo_name: String,
) {

    require_auth(owner);

    let _self = current_receiver();
    let repostbl = Repoprofile::table(_self, _self);

    // Check if the owner already has a repo of the same name.
    let repo_count = repostbl.iter().filter_map(|x| x.get().ok())
                             .filter(|x| x.owner == owner)
                             .filter(|x| x.repo_name == repo_name)
                             .count();
    check(repo_count == 0, "repo name already exists");

    let repo_id = repostbl.available_primary_key().expect("failed to get primary key");


    let repo = Repoprofile {
        repo_id,
        repo_name,
        owner,
    };

    repostbl.emplace(owner, &repo).check("write");
}

#[eosio::action]
fn addfile(
    file_name: String,
    ipfs_hash: String,
    repo_id: u64,
    contributor: AccountName,
) {
    require_auth(contributor);

    let _self = current_receiver();
    let table = Repoprofile::table(_self, _self);

    table
        .find(repo_id)
        .is_some()
        .check("repo doesn't exist");

    let table = Repo::table(_self, _self);
    // Count how many files have the same name within the repo specified by the eosio method caller.
    let file_count = table.iter().filter_map(|x| x.get().ok())
                          .filter(|x| x.repo_id == repo_id)
                          .filter(|x| x.file_name == file_name)
                          .count();

    check(file_count == 0, "file name already exists");

    let file_id = table.available_primary_key().expect("failed to get primary key");

    let file = Repo {
        file_id,
        file_name,
        ipfs_hash,
        repo_id,
        last_contributor: contributor,
    };

    table.emplace(contributor, &file).check("write");
}

#[eosio::action]
fn removefile(
    file_id: u64,
    contributor: AccountName,
) {
    require_auth(contributor);

    let _self = current_receiver();
    let table = Repo::table(_self, _self);

    let erase = |cursor: ptc<Repo>| {cursor.erase().check("invalid index");};
    let unwind = || check(false, "file doesn't exist");

    // Remove the file or unwind the stack if the file can't be found.
    table
        .find(file_id)
        .map_or_else(|| unwind(), |cursor| erase(cursor) );
}

#[eosio::action]
fn sendcreq(
   repo_id: u64, 
   file_name: String,
   ipfs_hash: String,
   contributor: AccountName,
) {

    let _self = current_receiver();

    let creqtbl = creq::table(_self, _self);
    let proftbl = Repoprofile::table(_self, _self);
    let repotbl = Repo::table(_self, _self);

    proftbl
        .find(repo_id)
        .is_some()
        .check("repo doesn't exist");

    // Does the file exist already?
    let entry = repotbl.iter().filter_map(|x| x.get().ok())
                          .filter(|x| x.repo_id == repo_id)
                          .find(|x| x.file_name == file_name); // find short-circuits


    if let Some(x) = entry {
        let file_id = x.file_id;
    } else {
        let file_id = repotbl.available_primary_key().expect("failed to get primary key");
    }

    //eosio::print!("file_id:\n{:#?}", file_id);

    let creq_id = creqtbl.available_primary_key().expect("failed to get primary key");

    let creq = creq {
        creq_id,
        file_name,
        ipfs_hash,
        repo_id,
        contributor,
    };

    creqtbl.emplace(contributor, &creq).check("write");

}

eosio_cdt::abi!(mkdir, addfile, removefile, sendcreq);

#[eosio::table("repoprofile")]
struct Repoprofile {
 #[eosio(primary_key)]
 repo_id: u64,
 repo_name: String,
 owner: AccountName,
}

#[eosio::table("repo")]
struct Repo {
 #[eosio(primary_key)]
 file_id: u64,
 file_name: String,
 ipfs_hash: String,
 #[eosio(secondary_key)]
 repo_id: u64,
 last_contributor: AccountName,
}


#[eosio::table("creq")]
struct creq {
    #[eosio(primary_key)]
    creq_id: u64,
    file_name: String,
    ipfs_hash: String,
    #[eosio(secondary_key)]
    repo_id: u64,
    contributor: AccountName,

}
