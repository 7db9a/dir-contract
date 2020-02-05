FROM ubuntu:18.04

RUN apt-get update && apt-get install -y \
        software-properties-common build-essential \
        wget \
        curl \
        cmake \
        git \
        python

# Install rust.
RUN curl https://sh.rustup.rs -sSf | sh -s -- -y

# Install eos.
WORKDIR /root
RUN mkdir Download
WORKDIR /root/Download
RUN wget https://github.com/EOSIO/eos/releases/download/v1.8.9/eosio_1.8.9-1-ubuntu-18.04_amd64.deb
RUN apt install -y ./eosio_1.8.9-1-ubuntu-18.04_amd64.deb
RUN wget https://github.com/EOSIO/eosio.cdt/releases/download/v1.7.0/eosio.cdt_1.7.0-1-ubuntu-18.04_amd64.deb
RUN apt install -y ./eosio.cdt_1.7.0-1-ubuntu-18.04_amd64.deb

# Install eos dev related software.
RUN /root/.cargo/bin/rustup target add wasm32-unknown-unknown
RUN /root/.cargo/bin/cargo install wasm-gc
RUN git clone https://github.com/WebAssembly/binaryen
RUN cd binaryen && cmake . && make && mv bin/wasm-opt /usr/local/bin/
RUN cd - && git clone --recursive https://github.com/WebAssembly/wabt
RUN cd wabt && mkdir build && cd build && cmake .. && cmake --build .


# Install eoslime.
RUN apt install -y nodejs npm
WORKDIR /project/testing
RUN npm install -y --save-dev --verbose

WORKDIR /project
