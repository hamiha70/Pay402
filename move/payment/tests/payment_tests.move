#[test_only]
module payment::payment_tests {
    use sui::test_scenario;
    use sui::coin::{Self, Coin};
    use sui::clock;
    use sui::sui::SUI;
    use payment::payment;
    use std::debug;
    
    #[test]
    fun test_buyer_pays_amount_plus_fee_merchant_receives_full_amount() {
        use std::string;
        
        debug::print(&string::utf8(b"=== Fee Model Test: Fee Added On Top ==="));
        
        // Setup: Create test addresses
        let _buyer = @0xBABE;
        let merchant = @0xCAFE;
        let facilitator = @0xFACE;
        
        // Start test scenario as facilitator (who will call settle_payment)
        let mut scenario = test_scenario::begin(facilitator);
        
        // Create a clock for timestamps
        let clock = clock::create_for_testing(scenario.ctx());
        
        {
            // Create a mock coin with 1000 SUI for testing
            let mut buyer_coin = coin::mint_for_testing<SUI>(1000, scenario.ctx());
            
            let initial_balance = coin::value(&buyer_coin);
            debug::print(&string::utf8(b"\n1. BEFORE PAYMENT:"));
            debug::print(&string::utf8(b"   Buyer balance: "));
            debug::print(&initial_balance);
            
            // Call settle_payment:
            // - Amount: 100 (to merchant - FULL amount)
            // - Fee: 10 (to facilitator - ADDED ON TOP)
            // - Total deducted from buyer: 110 (100 + 10)
            debug::print(&string::utf8(b"\n2. EXECUTING PAYMENT:"));
            debug::print(&string::utf8(b"   Amount to merchant: 100"));
            debug::print(&string::utf8(b"   Fee to facilitator: 10"));
            debug::print(&string::utf8(b"   Total cost to buyer: 110"));
            
            let _receipt = payment::settle_payment(
                &mut buyer_coin,
                100,        // amount (merchant gets this)
                merchant,
                10,         // facilitator_fee (added on top)
                b"test_payment_001", // payment_id
                &clock,
                scenario.ctx()
            );
            
            // Verify: Buyer's coin was reduced correctly
            let remaining = coin::value(&buyer_coin);
            debug::print(&string::utf8(b"\n3. AFTER PAYMENT:"));
            debug::print(&string::utf8(b"   Buyer balance: "));
            debug::print(&remaining);
            debug::print(&string::utf8(b"   (Paid 110 total: 100 + 10)"));
            
            assert!(remaining == 890, 0);
            
            // Clean up
            coin::burn_for_testing(buyer_coin);
        };
        
        // Check merchant received payment
        scenario.next_tx(merchant);
        {
            let merchant_coin = scenario.take_from_sender<Coin<SUI>>();
            let merchant_amount = coin::value(&merchant_coin);
            
            debug::print(&string::utf8(b"\n4. MERCHANT RECEIVED:"));
            debug::print(&string::utf8(b"   Amount: "));
            debug::print(&merchant_amount);
            debug::print(&string::utf8(b"   (Full 100, no fee deduction)"));
            
            assert!(merchant_amount == 100, 1);
            scenario.return_to_sender(merchant_coin);
        };
        
        // Check facilitator received fee
        scenario.next_tx(facilitator);
        {
            let facilitator_coin = scenario.take_from_sender<Coin<SUI>>();
            let fee_amount = coin::value(&facilitator_coin);
            
            debug::print(&string::utf8(b"\n5. FACILITATOR RECEIVED:"));
            debug::print(&string::utf8(b"   Fee: "));
            debug::print(&fee_amount);
            
            assert!(fee_amount == 10, 2);
            scenario.return_to_sender(facilitator_coin);
        };
        
        debug::print(&string::utf8(b"\n=== SUMMARY ==="));
        debug::print(&string::utf8(b"Buyer paid:      110 (100 + 10)"));
        debug::print(&string::utf8(b"Merchant got:    100 (full amount)"));
        debug::print(&string::utf8(b"Facilitator got: 10  (fee)"));
        debug::print(&string::utf8(b"✓ Fee is ADDED ON TOP, not subtracted!"));
        
        // Clean up
        clock.destroy_for_testing();
        scenario.end();
    }
}
