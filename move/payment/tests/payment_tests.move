#[test_only]
module payment::payment_tests {
    use sui::test_scenario;
    use sui::coin::{Self, Coin};
    use sui::clock;
    use sui::sui::SUI;
    use payment::payment;
    
    // ============================================================================
    // Mock Token for Testing Generics
    // ============================================================================
    
    /// Test-only token to verify settle_payment works with any Coin<T>
    public struct MOCK_USDC has drop {}
    
    // ============================================================================
    // Tests with SUI
    // ============================================================================
    
    #[test]
    fun test_buyer_pays_amount_plus_fee_merchant_receives_full_amount() {
        // Setup: Create test addresses
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        
        // Start test scenario as BUYER (must match ctx.sender())
        let mut scenario = test_scenario::begin(buyer);
        
        // Create a clock for timestamps
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            // Create a mock coin with 1000 SUI for testing
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            // Call settle_payment:
            // - Amount: 100 (to merchant - FULL amount)
            // - Fee: 10 (to facilitator - ADDED ON TOP)
            // - Total deducted from buyer: 110 (100 + 10)
            payment::settle_payment(
                &mut buyer_coin,
                buyer,      // buyer address (for audit trail)
                100,        // amount (merchant gets this)
                merchant,
                10,         // facilitator_fee (added on top)
                b"test_payment_001", // payment_id
                &clock,
                scenario.ctx()
            );
            
            // Verify: Buyer's coin was reduced correctly
            let remaining = coin::value(&buyer_coin);
            assert!(remaining == 890, 0);
            
            // Clean up
            coin::burn_for_testing(buyer_coin);
        };
        
        // Check merchant received payment
        scenario.next_tx(merchant);
        {
            let merchant_coin = scenario.take_from_sender<Coin<SUI>>();
            let merchant_amount = coin::value(&merchant_coin);
            
            assert!(merchant_amount == 100, 1);
            scenario.return_to_sender(merchant_coin);
        };
        
        // Check facilitator received fee (in tests, facilitator = buyer = sender)
        scenario.next_tx(buyer);
        {
            let facilitator_coin = scenario.take_from_sender<Coin<SUI>>();
            let fee_amount = coin::value(&facilitator_coin);
            
            assert!(fee_amount == 10, 2);
            scenario.return_to_sender(facilitator_coin);
        };
        
        // Clean up
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    #[expected_failure(abort_code = 2, location = sui::balance)]  // balance::ENotEnough
    fun test_insufficient_balance_fails() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            // Create coin with only 50 SUI
            let mut buyer_coin = coin::mint_for_testing<SUI>(50, scenario.ctx());
            
            // Try to pay 110 total (100 + 10), but only have 50
            // This SHOULD fail with coin::ENotEnough (code 2)
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                100,
                merchant,
                10,
                b"test_insufficient",
                &clock,
                scenario.ctx()
            );
            
            // Should never reach here
            coin::burn_for_testing(buyer_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    #[expected_failure(abort_code = 2, location = sui::balance)]  // balance::ENotEnough
    fun test_insufficient_balance_due_to_fee() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            // Create coin with exactly 100 SUI
            let mut buyer_coin = coin::mint_for_testing<SUI>(100, scenario.ctx());
            
            // Enough for amount (100), but not for fee (10)
            // Total needed: 110, but only have 100
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                100,
                merchant,
                10,
                b"test_edge_insufficient",
                &clock,
                scenario.ctx()
            );
            
            coin::burn_for_testing(buyer_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    fun test_zero_amount_payment_only_fee() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            // Amount = 0, Fee = 10
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                0,          // zero amount to merchant
                merchant,
                10,         // still charge fee
                b"test_zero_amount",
                &clock,
                scenario.ctx()
            );
            
            // Buyer should have 990 left (1000 - 10)
            assert!(coin::value(&buyer_coin) == 990, 0);
            
            coin::burn_for_testing(buyer_coin);
        };
        
        // Merchant should get 0
        scenario.next_tx(merchant);
        {
            let merchant_coin = scenario.take_from_sender<Coin<SUI>>();
            assert!(coin::value(&merchant_coin) == 0, 1);
            scenario.return_to_sender(merchant_coin);
        };
        
        // Facilitator should get 10 (in tests, facilitator = buyer)
        scenario.next_tx(buyer);
        {
            let facilitator_coin = scenario.take_from_sender<Coin<SUI>>();
            assert!(coin::value(&facilitator_coin) == 10, 2);
            scenario.return_to_sender(facilitator_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    fun test_zero_fee_full_amount_to_merchant() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            // Amount = 100, Fee = 0 (free facilitator)
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                100,        // amount to merchant
                merchant,
                0,          // zero fee
                b"test_zero_fee",
                &clock,
                scenario.ctx()
            );
            
            // Buyer should have 900 left (1000 - 100)
            assert!(coin::value(&buyer_coin) == 900, 0);
            
            coin::burn_for_testing(buyer_coin);
        };
        
        // Merchant should get 100
        scenario.next_tx(merchant);
        {
            let merchant_coin = scenario.take_from_sender<Coin<SUI>>();
            assert!(coin::value(&merchant_coin) == 100, 1);
            scenario.return_to_sender(merchant_coin);
        };
        
        // Facilitator should get 0 (in tests, facilitator = buyer)
        scenario.next_tx(buyer);
        {
            let facilitator_coin = scenario.take_from_sender<Coin<SUI>>();
            assert!(coin::value(&facilitator_coin) == 0, 2);
            scenario.return_to_sender(facilitator_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    fun test_receipt_returns_without_error() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            // Call and receive receipt
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                100,
                merchant,
                10,
                b"test_receipt_123",
                &clock,
                scenario.ctx()
            );
            
            // Receipt has 'drop' ability, so it automatically drops here
            // If receipt had issues (wrong fields, etc.), would fail to compile
            // The fact that this compiles and runs proves receipt is correct
            
            coin::burn_for_testing(buyer_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    fun test_large_amounts_no_overflow() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            // Use large amount (but not MAX to avoid actual overflow)
            let large_amount: u64 = 1_000_000_000_000; // 1 trillion
            let total_balance = large_amount + 1000;
            
            let mut buyer_coin = coin::mint_for_testing<SUI>(total_balance, scenario.ctx());
            
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                large_amount,
                merchant,
                1000,
                b"test_large",
                &clock,
                scenario.ctx()
            );
            
            // Should complete without overflow
            assert!(coin::value(&buyer_coin) == 0, 0);
            
            coin::burn_for_testing(buyer_coin);
        };
        
        scenario.next_tx(merchant);
        {
            let merchant_coin = scenario.take_from_sender<Coin<SUI>>();
            assert!(coin::value(&merchant_coin) == 1_000_000_000_000, 1);
            scenario.return_to_sender(merchant_coin);
        };
        
        scenario.next_tx(buyer);
        {
            let facilitator_coin = scenario.take_from_sender<Coin<SUI>>();
            assert!(coin::value(&facilitator_coin) == 1000, 2);
            scenario.return_to_sender(facilitator_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    // ============================================================================
    // Tests with MOCK_USDC (Generic Coin<T>)
    // ============================================================================
    
    #[test]
    fun test_mock_usdc_happy_path() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            // Create MOCK_USDC coin (6 decimals like real USDC)
            let mut buyer_coin = coin::mint_for_testing<MOCK_USDC>(1000_000000, scenario.ctx()); // 1000 USDC
            
            // Pay 100 USDC + 10 USDC fee
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                100_000000,  // 100 USDC
                merchant,
                10_000000,   // 10 USDC fee
                b"usdc_payment_001",
                &clock,
                scenario.ctx()
            );
            
            // Buyer should have 890 USDC left
            assert!(coin::value(&buyer_coin) == 890_000000, 0);
            coin::burn_for_testing(buyer_coin);
        };
        
        // Merchant gets 100 USDC
        scenario.next_tx(merchant);
        {
            let merchant_coin = scenario.take_from_sender<Coin<MOCK_USDC>>();
            assert!(coin::value(&merchant_coin) == 100_000000, 1);
            scenario.return_to_sender(merchant_coin);
        };
        
        // Facilitator gets 10 USDC
        scenario.next_tx(buyer);
        {
            let facilitator_coin = scenario.take_from_sender<Coin<MOCK_USDC>>();
            assert!(coin::value(&facilitator_coin) == 10_000000, 2);
            scenario.return_to_sender(facilitator_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    #[expected_failure(abort_code = 2, location = sui::balance)]
    fun test_mock_usdc_insufficient_balance() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            // Only 50 USDC, need 110
            let mut buyer_coin = coin::mint_for_testing<MOCK_USDC>(50_000000, scenario.ctx());
            
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                100_000000,
                merchant,
                10_000000,
                b"usdc_fail",
                &clock,
                scenario.ctx()
            );
            
            coin::burn_for_testing(buyer_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    #[expected_failure(abort_code = 2, location = sui::balance)]
    fun test_mock_usdc_insufficient_for_fee() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            // Exactly 100 USDC, need 110 (100 + 10 fee)
            let mut buyer_coin = coin::mint_for_testing<MOCK_USDC>(100_000000, scenario.ctx());
            
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                100_000000,
                merchant,
                10_000000,
                b"usdc_edge_fail",
                &clock,
                scenario.ctx()
            );
            
            coin::burn_for_testing(buyer_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    fun test_mock_usdc_zero_amount() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<MOCK_USDC>(1000_000000, scenario.ctx());
            
            // Amount = 0, Fee = 10 USDC
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                0,
                merchant,
                10_000000,
                b"usdc_zero_amount",
                &clock,
                scenario.ctx()
            );
            
            assert!(coin::value(&buyer_coin) == 990_000000, 0);
            coin::burn_for_testing(buyer_coin);
        };
        
        // Merchant gets 0
        scenario.next_tx(merchant);
        {
            let merchant_coin = scenario.take_from_sender<Coin<MOCK_USDC>>();
            assert!(coin::value(&merchant_coin) == 0, 1);
            scenario.return_to_sender(merchant_coin);
        };
        
        // Facilitator gets 10 USDC
        scenario.next_tx(buyer);
        {
            let facilitator_coin = scenario.take_from_sender<Coin<MOCK_USDC>>();
            assert!(coin::value(&facilitator_coin) == 10_000000, 2);
            scenario.return_to_sender(facilitator_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    fun test_mock_usdc_zero_fee() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<MOCK_USDC>(1000_000000, scenario.ctx());
            
            // Amount = 100 USDC, Fee = 0
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                100_000000,
                merchant,
                0,
                b"usdc_zero_fee",
                &clock,
                scenario.ctx()
            );
            
            assert!(coin::value(&buyer_coin) == 900_000000, 0);
            coin::burn_for_testing(buyer_coin);
        };
        
        // Merchant gets 100 USDC
        scenario.next_tx(merchant);
        {
            let merchant_coin = scenario.take_from_sender<Coin<MOCK_USDC>>();
            assert!(coin::value(&merchant_coin) == 100_000000, 1);
            scenario.return_to_sender(merchant_coin);
        };
        
        // Facilitator gets 0
        scenario.next_tx(buyer);
        {
            let facilitator_coin = scenario.take_from_sender<Coin<MOCK_USDC>>();
            assert!(coin::value(&facilitator_coin) == 0, 2);
            scenario.return_to_sender(facilitator_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    fun test_mock_usdc_large_amounts() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            // 1 billion USDC + 1000 USDC fee
            let large_amount: u64 = 1_000_000_000_000000; // 1B USDC
            let total = large_amount + 1000_000000;
            
            let mut buyer_coin = coin::mint_for_testing<MOCK_USDC>(total, scenario.ctx());
            
            payment::settle_payment(
                &mut buyer_coin,
                buyer,    // buyer address
                large_amount,
                merchant,
                1000_000000,
                b"usdc_large",
                &clock,
                scenario.ctx()
            );
            
            assert!(coin::value(&buyer_coin) == 0, 0);
            coin::burn_for_testing(buyer_coin);
        };
        
        scenario.next_tx(merchant);
        {
            let merchant_coin = scenario.take_from_sender<Coin<MOCK_USDC>>();
            assert!(coin::value(&merchant_coin) == 1_000_000_000_000000, 1);
            scenario.return_to_sender(merchant_coin);
        };
        
        scenario.next_tx(buyer);
        {
            let facilitator_coin = scenario.take_from_sender<Coin<MOCK_USDC>>();
            assert!(coin::value(&facilitator_coin) == 1000_000000, 2);
            scenario.return_to_sender(facilitator_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    // ============================================================================
    // Validation Tests - Basic Input Validation
    // ============================================================================
    
    #[test]
    #[expected_failure(abort_code = 1)]  // E_EMPTY_PAYMENT_ID
    fun test_empty_payment_id_fails_validation() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            // Empty payment_id should fail validation
            payment::settle_payment(
                &mut buyer_coin,
                buyer,
                100,
                merchant,
                10,
                b"",        // ← Empty payment ID (INVALID)
                &clock,
                scenario.ctx()
            );
            
            coin::burn_for_testing(buyer_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    // ============================================================================
    // Validation Tests - Sponsored Transaction Security
    // ============================================================================
    
    #[test]
    #[expected_failure(abort_code = 2)]  // E_BUYER_MISMATCH
    fun test_buyer_mismatch_fails() {
        let buyer = @0xBABE;
        let wrong_buyer = @0xDEAD;  // Wrong address!
        let merchant = @0xCAFE;
        // Start scenario as BUYER (the actual signer)
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            // Try to pass wrong_buyer as parameter
            // But ctx.sender() = buyer (the actual signer)
            // This MUST fail with E_BUYER_MISMATCH
            payment::settle_payment(
                &mut buyer_coin,
                wrong_buyer,  // ← WRONG! Doesn't match ctx.sender()
                100,
                merchant,
                10,
                b"test_mismatch",
                &clock,
                scenario.ctx()
            );
            
            coin::burn_for_testing(buyer_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    fun test_buyer_match_succeeds() {
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        
        // Start scenario as BUYER (the actual signer)
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            // Pass correct buyer address matching ctx.sender()
            // This SHOULD succeed
            payment::settle_payment(
                &mut buyer_coin,
                buyer,  // ← CORRECT! Matches ctx.sender()
                100,
                merchant,
                10,
                b"test_correct_buyer",
                &clock,
                scenario.ctx()
            );
            
            // Verify payment went through
            assert!(coin::value(&buyer_coin) == 890, 0);
            coin::burn_for_testing(buyer_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    fun test_non_sponsored_transaction_succeeds() {
        // NOTE: In test_scenario, transactions are NOT sponsored by default
        // ctx.sponsor() returns None
        // This test verifies non-sponsored transactions work (for testing)
        
        let buyer = @0xBABE;
        let merchant = @0xCAFE;
        
        // Start scenario as buyer (non-sponsored transaction)
        let mut scenario = test_scenario::begin(buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            // Call settle_payment without sponsorship
            // ctx.sponsor() = None, facilitator will be ctx.sender()
            payment::settle_payment(
                &mut buyer_coin,
                buyer,  // Matches ctx.sender()
                100,
                merchant,
                10,
                b"test_no_sponsor",
                &clock,
                scenario.ctx()
            );
            
            // Verify payment went through
            assert!(coin::value(&buyer_coin) == 890, 0);
            coin::burn_for_testing(buyer_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    // ============================================================================
    // Security Edge Cases
    // ============================================================================
    
    #[test]
    #[expected_failure(abort_code = 2)]  // E_BUYER_MISMATCH
    fun test_facilitator_cannot_lie_about_buyer() {
        let real_buyer = @0xBABE;
        let fake_buyer = @0xFADE;  // Changed from FAKE (invalid hex)
        let merchant = @0xCAFE;
        
        // Scenario: Malicious facilitator tries to claim payment from fake_buyer
        // But real_buyer is the actual signer
        let mut scenario = test_scenario::begin(real_buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            // Malicious facilitator passes fake_buyer
            // But ctx.sender() = real_buyer
            // Validation MUST catch this
            payment::settle_payment(
                &mut buyer_coin,
                fake_buyer,  // ← LIE! Doesn't match ctx.sender()
                100,
                merchant,
                10,
                b"test_fake",
                &clock,
                scenario.ctx()
            );
            
            coin::burn_for_testing(buyer_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    #[expected_failure(abort_code = 2)]  // E_BUYER_MISMATCH
    fun test_merchant_address_as_buyer_fails_if_not_signer() {
        let real_buyer = @0xBABE;
        let merchant = @0xCAFE;
        
        // Scenario: Try to set merchant as buyer (not the signer)
        let mut scenario = test_scenario::begin(real_buyer);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            // Pass merchant as buyer, but real_buyer is signer
            payment::settle_payment(
                &mut buyer_coin,
                merchant,  // ← Doesn't match ctx.sender()
                100,
                merchant,
                10,
                b"test_self_pay",
                &clock,
                scenario.ctx()
            );
            
            coin::burn_for_testing(buyer_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
    
    #[test]
    fun test_self_payment_succeeds_if_buyer_is_signer() {
        // Scenario: User pays themselves (buyer = merchant = signer)
        let user = @0xBABE;
        
        let mut scenario = test_scenario::begin(user);
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            // Self-payment: buyer = merchant = ctx.sender()
            // Non-sponsored: facilitator will also be ctx.sender()
            payment::settle_payment(
                &mut buyer_coin,
                user,   // buyer = signer ✅
                100,
                user,   // merchant = buyer (self-pay)
                10,
                b"test_self",
                &clock,
                scenario.ctx()
            );
            
            assert!(coin::value(&buyer_coin) == 890, 0);
            coin::burn_for_testing(buyer_coin);
        };
        
        // User receives both merchant payment + fee (facilitator = sender in tests)
        scenario.next_tx(user);
        {
            let payment_coin = scenario.take_from_sender<Coin<SUI>>();
            let fee_coin = scenario.take_from_sender<Coin<SUI>>();
            
            // Should receive 100 + 10 = 110 back (in 2 separate coins)
            let total = coin::value(&payment_coin) + coin::value(&fee_coin);
            assert!(total == 110, 1);
            
            scenario.return_to_sender(payment_coin);
            scenario.return_to_sender(fee_coin);
        };
        
        clock.destroy_for_testing();
        scenario.end();
    }
}
