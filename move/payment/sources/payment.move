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
    use sui::coin::Coin;
    use sui::clock::Clock;
    
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
    
    // === Public Functions ===
    
    /// Settle x402 payment by splitting buyer's coin
    /// 
    /// Generic over any Coin<T> (USDC, SUI, custom tokens)
    /// Uses &mut to prevent buyer from front-running settlement
    /// 
    /// # Fee Model
    /// Facilitator fee is ADDED ON TOP of merchant amount:
    /// - Buyer pays: amount + facilitator_fee
    /// - Merchant receives: amount (full amount)
    /// - Facilitator receives: facilitator_fee (fixed fee, e.g., $0.01)
    /// 
    /// Fee is determined off-chain by facilitator (in TypeScript config)
    /// Buyer must sign PTB with explicit amounts before submission
    /// 
    /// # Arguments
    /// * `buyer_coin` - Mutable reference to buyer's coin (prevents front-running)
    /// * `amount` - Payment amount (to merchant)
    /// * `merchant` - Merchant's address
    /// * `facilitator_fee` - Fixed fee for facilitator (e.g., 10000 microUSDC = $0.01)
    /// * `payment_id` - Unique payment identifier from x402 request
    /// * `clock` - Sui Clock object for timestamp
    /// * `ctx` - Transaction context
    /// 
    /// # Returns
    /// EphemeralReceipt with payment details (zero storage cost)
    #[allow(lint(self_transfer))]
    public fun settle_payment<T>(
        buyer_coin: &mut Coin<T>,
        amount: u64,
        merchant: address,
        facilitator_fee: u64,
        payment_id: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ): EphemeralReceipt {
        use sui::coin;
        use sui::clock;
        use std::type_name;
        use std::ascii;
        
        let facilitator = ctx.sender();
        
        // Split merchant payment from buyer's coin (full amount)
        // CRITICAL: &mut prevents buyer from spending coin elsewhere during settlement
        let merchant_payment = coin::split(buyer_coin, amount, ctx);
        
        // Split facilitator fee from buyer's coin (added on top, not subtracted!)
        let fee_payment = coin::split(buyer_coin, facilitator_fee, ctx);
        
        // Transfer merchant payment (full amount)
        transfer::public_transfer(merchant_payment, merchant);
        
        // Transfer facilitator fee (separate from merchant payment)
        transfer::public_transfer(fee_payment, facilitator);
        
        // Get coin type name for event/receipt
        let coin_type_name = type_name::with_defining_ids<T>();
        let coin_type_string = type_name::into_string(coin_type_name);
        let coin_type_bytes = *ascii::as_bytes(&coin_type_string);
        
        // Get timestamp
        let timestamp_ms = clock::timestamp_ms(clock);
        
        // Emit event for off-chain indexing
        event::emit(PaymentSettled {
            payment_id,
            buyer: @0x0, // TODO: derive from coin ownership
            merchant,
            facilitator,
            amount,
            facilitator_fee,
            coin_type: coin_type_bytes,
            timestamp_ms,
        });
        
        // Return ephemeral receipt (zero storage)
        EphemeralReceipt {
            payment_id,
            buyer: @0x0, // TODO: derive from coin ownership
            merchant,
            amount,
            coin_type: coin_type_bytes,
            timestamp_ms,
        }
    }
}
