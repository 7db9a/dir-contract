#!/bin/bash

# See
# https://developers.eos.io/manuals/eos/latest/cleos/command-reference/get/currency-balance
get-balance() {
    docker exec \
    -it \
    docker_keosd_1 \
    cleos \
    --url http://nodeosd:8888 \
    --wallet-url http://127.0.0.1:8900 \
    get currency balance \
    eosio.token \ # contract
    test1 \       # account
    DIR           # symbol
}
