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
    /root/.cargo/bin/wasm-gc target/wasm32-unknown-unknown/release/eosio_token.wasm eosio.token.wasm
}

wasm-opt() {
    docker exec \
    -it \
    docker_dir-contract_1 \
    wasm-opt dircontract_gc.wasm --output dircontract_gc_opt.wasm -Oz
}

wasm-opt-token-test() {
    docker exec \
    -it \
    docker_dir-contract_1 \
    wasm-opt eosio.token.wasm --output wasm-opt eosio.token.wasm -Oz
}

build() {
    cargo-build
    wasm-gc
    wasm-opt
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
    set code dir1 eosio.token.wasm
}

run_token_test() {
    docker exec \
    -it \
    docker_nodeosd_1 \
    npm test --prefix testing tests/token.js
}

orchestrate_token_test() {
    start_docker_compose &
    sleep 15
    run_token_test
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

run_vote_test() {
    docker exec \
    -it \
    docker_nodeosd_1 \
    npm test --prefix testing tests/vote_operations.js
}

run_test() {
    if [ "$1" = "basic" ]; then
        echo "basic test run"
        run_basic_test
    fi

    if [ "$1" = "vote" ]; then
        echo "vote test run"
        run_vote_test
    fi

    if [ "$1" = "token" ]; then
        echo "token test run"
        echo ""
        echo "requires a clean blockchain for each run"
        echo ""
        echo "steps: "
        echo " 1. docker-compose up"
        echo " 2. wait a few seconds"
        echo " 3. npm test --prefix testing tests/token.js"
        echo " 4. docker-compose stop"
        echo ""
        orchestrate_token_test
    fi

    if [ "$1" = "" ]; then
        echo "all test run"
        run_basic_test
        run_vote_test
        stop_docker_compose
        orchestrate_token_test
    fi
}

run() {
    build
    wallet-unlock
    account-create
    set-abi-code
    install_eoslime
    run_test
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

if [ "$1" == "run" ]; then
    echo "run"
    run
fi

if [ "$1" == "build" ]; then
    echo "build"
    build
fi

if [ "$1" == "set" ]; then
    echo "set"
    set-abi-code
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
    run_test $2
fi

if [ "$1" == "token-test" ]; then
    echo "token-test"
    run_token_test
fi
