# dir-contract

This is an experimental contract that enables and incentivizes collaborative development. It's not useful to anyone yet so follow this repo for updates or come back again soon.

## Table of Contents

1. [Overview](#overview)
2. [Development Environment](#development-environment)
3. [Testing](#testing)

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

Add the password to the `docker/eos.env`. The pub and priv key in the file is for development.

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

## Testing

Testing is awkward at the moment. I haven't figured out how to run consecutive clean tests that need eosio.token.

The following tests must be ran against services that are already running (`docker-compose up`):

`./dev.sh test basic`

`./dev.sh test vote`

`./dev.sh test`

However, you don't need services running for

`./dev.sh test token`

The above token test will automatically `docker-compose up` and `docker-compose stop`. It also quiets the nodeosd logging printouts for ease of reading test results.
