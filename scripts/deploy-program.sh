#!/usr/bin/env bash
#
# deploy-program.sh -- Build and deploy the PXMON on-chain program
#
# Usage:
#   ./scripts/deploy-program.sh [devnet|mainnet] [--skip-build] [--keypair <path>]
#

set -euo pipefail

NETWORK="${1:-devnet}"
SKIP_BUILD=false
KEYPAIR=""
PROGRAM_DIR="programs/pxmon"

shift || true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --keypair)
      KEYPAIR="$2"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

case "$NETWORK" in
  devnet)
    RPC_URL="https://api.devnet.solana.com"
    ;;
  mainnet)
    RPC_URL="https://api.mainnet-beta.solana.com"
    ;;
  *)
    echo "Invalid network: $NETWORK (use devnet or mainnet)"
    exit 1
    ;;
esac

echo "=========================================="
echo "  PXMON Program Deployment"
echo "=========================================="
echo "  Network:  $NETWORK"
echo "  RPC:      $RPC_URL"
echo "  Program:  $PROGRAM_DIR"
echo "=========================================="

# Verify tools
command -v solana >/dev/null 2>&1 || { echo "solana CLI not found. Install: https://docs.solana.com/cli/install-solana-cli-tools"; exit 1; }
command -v anchor >/dev/null 2>&1 || { echo "anchor CLI not found. Install: https://www.anchor-lang.com/docs/installation"; exit 1; }

# Set Solana config
solana config set --url "$RPC_URL" >/dev/null

if [[ -n "$KEYPAIR" ]]; then
  solana config set --keypair "$KEYPAIR" >/dev/null
fi

DEPLOYER=$(solana address)
BALANCE=$(solana balance --lamports | awk '{print $1}')
BALANCE_SOL=$(echo "scale=4; $BALANCE / 1000000000" | bc)

echo ""
echo "  Deployer: $DEPLOYER"
echo "  Balance:  $BALANCE_SOL SOL"

if [[ "$NETWORK" == "mainnet" ]]; then
  MIN_BALANCE=5000000000  # 5 SOL
  if [[ "$BALANCE" -lt "$MIN_BALANCE" ]]; then
    echo ""
    echo "  WARNING: Low balance for mainnet deployment."
    echo "  Recommended minimum: 5 SOL"
    echo "  Current balance: $BALANCE_SOL SOL"
    echo ""
    read -p "  Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      echo "  Aborted."
      exit 0
    fi
  fi
fi

# Build
if [[ "$SKIP_BUILD" == false ]]; then
  echo ""
  echo "  Building program..."
  cd "$PROGRAM_DIR"
  anchor build
  cd - >/dev/null
  echo "  Build complete."
else
  echo ""
  echo "  Skipping build (--skip-build)."
fi

# Verify program binary exists
PROGRAM_SO="$PROGRAM_DIR/target/deploy/pxmon.so"
if [[ ! -f "$PROGRAM_SO" ]]; then
  echo "  ERROR: Program binary not found at $PROGRAM_SO"
  echo "  Run without --skip-build to compile."
  exit 1
fi

PROGRAM_SIZE=$(wc -c < "$PROGRAM_SO")
echo "  Program binary: $PROGRAM_SO ($PROGRAM_SIZE bytes)"

# Get program ID from keypair
PROGRAM_KEYPAIR="$PROGRAM_DIR/target/deploy/pxmon-keypair.json"
if [[ -f "$PROGRAM_KEYPAIR" ]]; then
  PROGRAM_ID=$(solana address -k "$PROGRAM_KEYPAIR")
  echo "  Program ID: $PROGRAM_ID"
else
  echo "  WARNING: No program keypair found. A new one will be generated."
fi

# Deploy
echo ""
echo "  Deploying to $NETWORK..."
echo ""

cd "$PROGRAM_DIR"
anchor deploy --provider.cluster "$RPC_URL"
cd - >/dev/null

echo ""
echo "=========================================="
echo "  Deployment complete."
echo "  Network:    $NETWORK"
echo "  Program ID: $PROGRAM_ID"
echo "  Explorer:   https://explorer.solana.com/address/$PROGRAM_ID?cluster=$NETWORK"
echo "=========================================="

# Save deployment info
DEPLOY_LOG="deployments/${NETWORK}-$(date +%Y%m%d-%H%M%S).json"
mkdir -p deployments

cat > "$DEPLOY_LOG" <<EOF
{
  "network": "$NETWORK",
  "programId": "$PROGRAM_ID",
  "deployer": "$DEPLOYER",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "binarySize": $PROGRAM_SIZE,
  "rpcUrl": "$RPC_URL"
}
EOF

echo "  Deployment log: $DEPLOY_LOG"