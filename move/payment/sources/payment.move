/// Pay402 Payment Settlement Module
/// 
/// Enables x402 micropayments on Sui blockchain with:
/// - Generic Coin<T> support (USDC, SUI, any token)
/// - Anti-front-running protection (&mut Coin<T>)
/// - Zero-storage ephemeral receipts
/// - Fixed facilitator fees
module payment::payment {
    // === Imports ===
    
    use sui::event;
    
    // === Structs ===
    
    /// Ephemeral receipt returned from settle_payment
    /// Zero storage cost - exists only in transaction execution
    public struct EphemeralReceipt has drop {
        payment_id: vector<u8>,
        buyer: address,
        merchant: address,
        amount: u64,
        coin_type: vector<u8>,
        timestamp_ms: u64,
    }
    
    /// Event emitted when payment is settled on-chain
    /// Permanent audit trail for off-chain indexing
    public struct PaymentSettled has copy, drop {
        payment_id: vector<u8>,
        buyer: address,
        merchant: address,
        facilitator: address,
        amount: u64,
        facilitator_fee: u64,
        coin_type: vector<u8>,
        timestamp_ms: u64,
    }
}
