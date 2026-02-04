/// MockUSDC - Simplified USDC for localnet testing
/// 
/// Features:
/// - 6 decimals (same as real USDC)
/// - Public mint function (for faucet)
/// - No regulated features (no deny list, no pause)
/// - Identical behavior to real USDC for payment testing
module mock_usdc::mock_usdc {
    use sui::coin::{Self, Coin, TreasuryCap};
    use sui::url;

    /// The One-Time Witness for MockUSDC
    public struct MOCK_USDC has drop {}

    /// Initialize the MockUSDC coin
    /// Creates TreasuryCap and CoinMetadata
    fun init(witness: MOCK_USDC, ctx: &mut TxContext) {
        let (treasury_cap, metadata) = coin::create_currency(
            witness,
            6,                           // decimals (same as real USDC)
            b"USDC",                     // symbol (same for testing)
            b"Mock USDC (Localnet)",     // name
            b"Mock USDC for localnet testing. Behaves identically to real USDC for Pay402 payment flows.",
            option::some(url::new_unsafe_from_bytes(b"https://www.circle.com/hubfs/Brand/USDC/USDC_icon_32x32.png")),
            ctx
        );

        // Freeze metadata (no updates needed)
        transfer::public_freeze_object(metadata);
        
        // Transfer treasury cap to deployer for minting
        transfer::public_transfer(treasury_cap, ctx.sender());
    }

    /// Mint MockUSDC tokens
    /// Public function for faucet/testing
    public fun mint(
        treasury_cap: &mut TreasuryCap<MOCK_USDC>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        let coin = coin::mint(treasury_cap, amount, ctx);
        transfer::public_transfer(coin, recipient);
    }

    /// Burn MockUSDC tokens
    public fun burn(
        treasury_cap: &mut TreasuryCap<MOCK_USDC>,
        coin: Coin<MOCK_USDC>
    ) {
        coin::burn(treasury_cap, coin);
    }

    #[test_only]
    /// Initialize for testing
    public fun init_for_testing(ctx: &mut TxContext) {
        init(MOCK_USDC {}, ctx);
    }
}
