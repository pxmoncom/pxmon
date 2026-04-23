# Multi-stage build for the PXMON CLI
FROM rust:1.78-slim-bookworm AS builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Cargo.toml Cargo.lock* rust-toolchain.toml ./
COPY programs/pxmon/Cargo.toml programs/pxmon/
RUN mkdir -p programs/pxmon/src && \
    echo "pub fn lib() {}" > programs/pxmon/src/lib.rs && \
    cargo build --release --workspace || true

COPY programs programs

RUN cargo build --release --workspace

FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -r -u 1001 -m pxmon

COPY --from=builder /app/target/release /usr/local/bin/pxmon-bin
USER pxmon

WORKDIR /home/pxmon

ENTRYPOINT ["/usr/local/bin/pxmon-bin/pxmon"]
