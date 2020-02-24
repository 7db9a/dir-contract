#!/bin/bash

cargo-build() {
    docker exec \
    -it \
    docker_dir-contract_1 \
    /root/.cargo/bin/cargo build --release --target=wasm32-unknown-unknown -p dircontract
}

cargo-build-token() {
    docker exec \
    -it \
    docker_dir-contract_1 \
    /root/.cargo/bin/cargo build --release --target=wasm32-unknown-unknown -p eosio_token
}

wasm-gc() {
    docker exec \
    -it \
    docker_dir-contract_1 \
    /root/.cargo/bin/wasm-gc target/wasm32-unknown-unknown/release/dircontract.wasm dircontract_gc.wasm
}


wasm-gc-token-test() {
    docker exec \
    -it \
    docker_dir-contract_1 \
    /root/.cargo/bin/wasm-gc target/wasm32-unknown-unknown/release/eosio_token.wasm eosio_token_gc.wasm
}

wasm-opt() {
    docker exec \
    -it \
    docker_dir-contract_1 \
    wasm-opt dircontract_gc.wasm --output dircontract_gc_opt.wasm -Oz
}

# Warns about: "Unexpected second positional argument 'eosio_token_gc_opt.wasm' for INFILE"
wasm-opt-token-test() {
    docker exec \
    -it \
    docker_dir-contract_1 \
    wasm-opt eosio_token_gc.wasm --output wasm-opt eosio_token_gc_opt.wasm -Oz
}

build() {
    cargo-build
    cargo-build-token
    wasm-gc
    wasm-gc-token-test
    wasm-opt
    #wasm-opt-token-test
}

wallet-create() {
    docker exec \
    -it \
    docker_keosd_1 \
    cleos \
    --url http://nodeosd:8888 \
    --wallet-url http://127.0.0.1:8900 \
    wallet create \
    -n dir1 \
    --to-console
}

wallet-unlock() {
    docker exec \
    -it \
    docker_keosd_1 \
    bash -c 'cleos \
    --url http://nodeosd:8888 \
    --wallet-url http://127.0.0.1:8900 \
    wallet unlock \
    -n dir1 \
    --password ${WALLET_PASSWORD}'
}

wallet-import() {
docker exec -it docker_keosd_1 \
    bash -c 'cleos \
    --url http://nodeosd:8888 \
    --wallet-url http://127.0.0.1:8900 \
    wallet import \
    -n dir1 \
    --private-key ${EOS_PRIVKEY}'
}

account-create() {
    docker exec \
    -it \
    docker_keosd_1 \
    bash -c 'cleos \
    --url http://nodeosd:8888 \
    --wallet-url http://127.0.0.1:8900 \
    create account eosio dir1 ${EOS_PUBKEY}'
}

set-abi-code() {
    docker exec \
    -it \
    docker_keosd_1 \
    cleos \
    --url http://nodeosd:8888 \
    --wallet-url http://127.0.0.1:8900 \
    set abi dir1 contracts/dir-contract/dircontract.abi.json
    set code dir1 dircontract_gc_opt.wasm
}

set-abi-code-token() {
    docker exec \
    -it \
    docker_keosd_1 \
    cleos \
    --url http://nodeosd:8888 \
    --wallet-url http://127.0.0.1:8900 \
    set abi dir1 contracts/eosio-rust/contracts/eosio_token/eosio_token.abi.json
    set code dir1 eosio_gc_opt.wasm
}

run_token_test() {
    docker exec \
    -it \
    docker_nodeosd_1 \
    npm test --prefix testing tests/token.js
}

run_vote_test() {
    docker exec \
    -it \
    docker_nodeosd_1 \
    npm test --prefix testing tests/vote.js
}


orchestrate_token_test() {
    start_docker_compose &
    sleep 7
    run_token_test
    stop_docker_compose
}

orchestrate_vote_test() {
    start_docker_compose &
    sleep 7
    run_vote_test
    stop_docker_compose
}

install_eoslime() {
    docker exec \
    -it \
    docker_nodeosd_1 \
    npm install --prefix /project/testing -y --save-dev --verbose
}

run_basic_test() {
    docker exec \
    -it \
    docker_nodeosd_1 \
    npm test --prefix testing tests/basic_operations.js
}

run_account_test() {
    docker exec \
    -it \
    docker_nodeosd_1 \
    npm test --prefix testing eoslime/tests/account-tests.js
}

deprecated_run_vote_test() {
    docker exec \
    -it \
    docker_nodeosd_1 \
    npm test --prefix testing tests/deprecated_vote_operations.js
}

run_test() {
    # Unlock and create account, otherwise we may not be able to push actions.
    wallet-unlock
    account-create

    if [ "$1" = "basic" ]; then
        echo "basic test run"
        run_basic_test
    fi

    if [ "$1" = "vote" ]; then
        echo "vote test run"
        echo ""
        echo "requires a clean blockchain for each run"
        echo ""
        echo "Following steps will be done automatically: "
        echo " 1. docker-compose up"
        echo " 2. wait a few seconds"
        echo " 3. npm test --prefix testing tests/token.js"
        echo " 4. docker-compose stop"
        echo ""
        echo "please wait ..."
        echo ""
        stop_docker_compose
        orchestrate_vote_test
    fi

    if [ "$1" = "token" ]; then
        echo "token test run"
        echo ""
        echo "requires a clean blockchain for each run"
        echo ""
        echo "Following steps will be done automatically: "
        echo " 1. docker-compose up"
        echo " 2. wait a few seconds"
        echo " 3. npm test --prefix testing tests/token.js"
        echo " 4. docker-compose stop"
        echo ""
        echo "please wait ..."
        echo ""
        stop_docker_compose
        orchestrate_token_test
    fi

    if [ "$1" = "" ]; then
        echo "all test run"
        run_basic_test
        stop_docker_compose
        orchestrate_token_test
        orchestrate_vote_test
    fi
}

run() {
    start_docker_compose &
    echo ""
    echo "Following steps will be done automatically: "
    echo " 1. start blockchain (docker-compose up)"
    echo " 2. build"
    echo " 3. unlock wallet and create account"
    echo " 4. set code"
    echo " 5. (re)-install eoslime"
    echo " 6. run test"
    echo ""
    echo "Please monitor the output, in case of a failed step."
    echo "Please wait a moment ..."
    echo ""
    sleep 5
    build
    wallet-unlock
    account-create
    set-abi-code
    install_eoslime
    run_test $1
}

start_docker_compose() {
    cd docker
    docker-compose up > /dev/null 2>&1
    cd - > /dev/null
}

stop_docker_compose() {
    cd docker
    docker-compose stop
    cd - > /dev/null
}


# #######################################################
#
# Throw-away commands for experimental purposes.
#
# See
# https://developers.eos.io/manuals/eos/latest/cleos/command-reference/get/currency-balance
#
# #######################################################
get-balance() {
    docker exec \
    -it \
    docker_keosd_1 \
    cleos \
    --url http://nodeosd:8888 \
    --wallet-url http://127.0.0.1:8900 \
    get currency balance eosio.token $1 $2
}

mkdir-rust() {
    docker exec \
    -it \
    docker_keosd_1 \
    cleos \
    --url http://nodeosd:8888 \
    --wallet-url http://127.0.0.1:8900 \
    get \
    abi \
    dir1
    #--help
    #push action dir mkdir '["test", "directory"]' -p 'dir1@active'
}

get-balance-rust() {
    docker exec \
    -it \
    docker_keosd_1 \
    cleos \
    --url http://nodeosd:8888 \
    --wallet-url http://127.0.0.1:8900 \
    push action eosio getbalance '["eosio.token", "le324caa7bc", "SYS"]' -p 'dir1@active'
}

vim-vt() {
    vim -c "vsplit testing/tests/deprecated_vote_operations.js" \
    testing/tests/vote.js
}

# Getting token balance with eosio.token balance action.
#docker exec \
#    -it \
#    docker_keosd_1 \
#    cleos \
#    --url http://nodeosd:8888 \
#    --wallet-url http://127.0.0.1:8900 \
#    push action eosio.token balance '["l135ac1ce2b5", "4,SYS"]' -p 'dir1@active'

# Getting token balance from 'purely' a cleos command.
#docker exec \
#    -it \
#    docker_keosd_1 \
#    cleos \
#    --url http://nodeosd:8888 \
#    --wallet-url http://127.0.0.1:8900 \
#    get currency balance <contract> <account> <symbol>

#`cleos push action testuser1 createrepo '["testuser1", "rust-eos"]' -p 'testuser1@active'`

if [ "$1" == "run" ]; then
    echo "run"
    run $2
fi

if [ "$1" == "build" ]; then
    echo "build"
    build
fi

if [ "$1" == "set" ]; then
    echo "set"
    set-abi-code
    set-abi-code-token
fi

if [ "$1" == "wallet-create" ]; then
    echo "create wallet"
    wallet-create
fi

if [ "$1" == "wallet-unlock" ]; then
    echo "wallet unlock"
    wallet-unlock
fi

if [ "$1" == "account-create" ]; then
    echo "creating account"
    account-create
fi

if [ "$1" == "import" ]; then
    echo "wallet import"
    wallet-import
fi

if [ "$1" == "test" ]; then
    echo "test"
    # Token tests must start up docker containers, so it must skip this part for now.
    if [ "$2" != "token" ]; then
        install_eoslime # It's okay to run this repeatedly.
    fi
    if [ "$2" != "vote" ]; then
        install_eoslime # It's okay to run this repeatedly.
    fi
    run_test $2
fi

if [ "$1" == "token-test" ]; then
    echo "token-test"
    run_token_test
fi

if [ "$1" == "get-balance" ]; then
    echo "get-balance"
    get-balance $2 $3
fi

if [ "$1" == "get-balance-rust" ]; then
    echo "get-balance-rust"
    get-balance-rust
fi

if [ "$1" == "mkdir-rust" ]; then
    echo "mkdir"
    mkdir-rust
fi


if [ "$1" == "vim-vt" ]; then
    echo "opening vim for vote test related"
    vim-vt
fi
