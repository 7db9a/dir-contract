# dir-contract

This is an experimental contract that enables and incentivizes collaborative development. It's not useful to anyone yet so follow this repo for updates or come back again soon.

## Table of Contents

1. [Overview](#overview)
2. [Development Environment](#development-environment)
3. [Testing](#testing)
4. [Help](#Help)

## Development Environment

This environment uses EOSIO v1 and installs EOSIO software binaries instead of building from source (see Dockerfile). It sets up [eosio-rust](https://github.com/sagan-software/eosio-rust) for contract development and [eoslime](https://github.com/LimeChain/eoslime) (nodejs) for tests. Nodeos and keos are launched in their own containers.

***Don't deploy production code using this environment. And don't hold actual tokens in a wallet made from here.***

```
git clone https://github.com/7db9a/dir-contract
cd dir-contract/docker
docker build -t rust-eos-dev:latest .
docker volume create --name=dir-contract-nodeos-data-volume
docker volume create --name=dir-contract-keosd-data-volume
docker volume create --name=dir-contract-cargo-data-volume
docker-compose up
```

Then from the top of your new project's directory:

`./dev.sh wallet-create`

Add the password to the `docker/eos.env`. The pub and priv keys in the file are for development.

Restart the services:

`docker-compose stop && docker-compose up --force-recreate`


### Build, set, and test

To build the rust code, deploy it locally, and run tests:

`./dev.sh run`

The commands broken down individually:

`./dev.sh build`

`./dev.sh set`

`./dev.sh test`

`dev.sh` is very basic and not generalized. Feel free to modify it or make your own script, or just run the actual underlying commands.

You can also run, but against a specific test.

`./dev.sh run token`

## Testing

Testing is awkward at the moment. I haven't figured out how to run consecutive clean tests that need eosio.token.

The following tests must be ran against services that are already running (`docker-compose up`):

`./dev.sh test basic`

`./dev.sh test`

However, you don't need services running for

`./dev.sh test token`
`./dev.sh test vote`

The above token test will automatically `docker-compose up` and `docker-compose stop`. It also quiets the nodeosd logging printouts for ease of reading test results.

## Help

#### Wrong permissions or keys

You may at some point get an `Error 3090003` about wrong keys or permissions. Most likely you need to create an account on local nodeos (maybe you deleted a docker volume or ran `docker-compose --force-recreate`).

`./dev.sh account-create`

If `./dev.sh set` doesn't work after that, try

`./dev.sh wallet-create`

If you get a new password, you'll have to place it in `docker/eos.env`.

Now try the following

```
./dev.sh import
./dv.sh wallet-unlock
./dev.sh account-create
```

`./dev.sh set` should work now.

#### Reset wallet

You may want to delete your wallet for some reason.

`docker exec -it docker_keosd_1 bash`

Then in the container:

`rm /opt/eosio/bin/data-dir/dir1.wallet`

...or whichever wallet you want to get rid of in `data-dir`.

## Caveats

The workflow has loads of side-effects. You can break things very easily.

#### Dev script

It's not a 'real' command line tool, yet. Values and names are often hardcoded. At the very least, you can reference the commands as examples for one-off commands you many need.

Please monitor the output when you run `dev.sh` commands. For example, it sleeps to wait for docker to do stuff and is full of side-effects.

`dev.sh` arose of a need to eliminate repetitive commands, and often forgeting to do stuff, like unlocking a wallet.

#### Naming conventions

The package name of your Cargo.toml will become the prefix of the wasm binary's name. See dev.sh and see the related commmands.

#### eosio_token contract

A workspace member can't import eosio_token. eosio_token loads a dynamic library. It's declared as `cdylib` eosio_token's Cargo.toml.  If `cdylib` is declared again in the workspace member's Cargo.toml, it just doesn't work. That said, I haven't investigated it too much. The `cdylib` is for compiling wasm binaries, to my understanding. As a result of all this, I reduplicate the `balance` functions in `eosio_token`.
