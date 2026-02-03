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
    
    // === Error Codes ===
    
    /// Payment ID cannot be empty
    const E_EMPTY_PAYMENT_ID: u64 = 1;
    
    /// Buyer parameter must match transaction signer
    const E_BUYER_MISMATCH: u64 = 2;
    
    // === Structs ===
    
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
    /// * `buyer` - Buyer's address (validated against transaction signer)
    /// * `amount` - Payment amount (to merchant)
    /// * `merchant` - Merchant's address
    /// * `facilitator_fee` - Fixed fee for facilitator (e.g., 10000 microUSDC = $0.01)
    /// * `payment_id` - Unique payment identifier from x402 request
    /// * `clock` - Sui Clock object for timestamp
    /// * `ctx` - Transaction context (contains buyer as sender, facilitator as sponsor)
    /// 
    /// # Returns
    /// None - Receipt is emitted as event only (zero storage cost)
    /// 
    /// # Security Validations
    /// * Buyer parameter must match ctx.sender() (transaction signer)
    /// * Facilitator obtained from ctx.sponsor() in production, ctx.sender() in tests
    /// 
    /// # Aborts
    /// * E_EMPTY_PAYMENT_ID (1): If payment_id is empty
    /// * E_BUYER_MISMATCH (2): If buyer parameter doesn't match transaction signer
    /// * balance::ENotEnough: If buyer_coin has insufficient balance (automatic)
    #[allow(lint(self_transfer))]
    public entry fun settle_payment<T>(
        buyer_coin: &mut Coin<T>,
        buyer: address,
        amount: u64,
        merchant: address,
        facilitator_fee: u64,
        payment_id: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        use sui::coin;
        use sui::clock;
        use std::type_name;
        use std::ascii;
        
        // === Validate Inputs ===
        
        // 1. Payment ID must not be empty
        assert!(std::vector::length(&payment_id) > 0, E_EMPTY_PAYMENT_ID);
        
        // === Validate Buyer Identity ===
        
        // 2. Buyer parameter must match transaction signer
        // This prevents facilitator from lying about buyer identity
        let actual_buyer = ctx.sender();
        assert!(actual_buyer == buyer, E_BUYER_MISMATCH);
        
        // === Get Facilitator Address ===
        
        // In sponsored transactions (production):
        // - ctx.sender() = buyer (who signed)
        // - ctx.sponsor() = Some(facilitator) (who pays gas)
        //
        // In non-sponsored transactions (unit tests):
        // - ctx.sender() = test address
        // - ctx.sponsor() = None
        //
        // Use sponsor if available, otherwise fall back to sender
        // SECURITY: In production, facilitator MUST sponsor the transaction
        // - ctx.sponsor() returns Some(facilitator_address)
        // - Facilitator pays gas fees
        // - This prevents buyer from being charged gas
        // In tests, sponsor is None, so we use sender (test address)
        let sponsor_opt = ctx.sponsor();
        let facilitator = if (option::is_some(&sponsor_opt)) {
            *option::borrow(&sponsor_opt)  // Sponsored: use sponsor address (production)
        } else {
            ctx.sender()  // Non-sponsored: use sender (tests only)
        };
        
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
            buyer,  // Actual buyer address (from parameter)
            merchant,
            facilitator,
            amount,
            facilitator_fee,
            coin_type: coin_type_bytes,
            timestamp_ms,
        });
        
        // Receipt is dropped automatically (has "drop" ability)
        // Event provides permanent audit trail for off-chain systems
    }
}
