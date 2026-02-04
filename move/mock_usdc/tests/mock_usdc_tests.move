#[test_only]
module mock_usdc::mock_usdc_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::coin::{Self, TreasuryCap, Coin};
    use mock_usdc::mock_usdc::{Self, MOCK_USDC};

    // Test addresses
    const ADMIN: address = @0xAD;
    const ALICE: address = @0xA11CE;
    const BOB: address = @0xB0B;

    #[test]
    fun test_init_creates_treasury() {
        let mut scenario = ts::begin(ADMIN);
        
        // Initialize the module
        mock_usdc::init_for_testing(ts::ctx(&mut scenario));
        
        // Admin should receive TreasuryCap
        ts::next_tx(&mut scenario, ADMIN);
        {
            assert!(ts::has_most_recent_for_sender<TreasuryCap<MOCK_USDC>>(&scenario), 0);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_mint_to_recipient() {
        let mut scenario = ts::begin(ADMIN);
        
        // Initialize
        mock_usdc::init_for_testing(ts::ctx(&mut scenario));
        
        // Mint 1000 USDC (1000 * 10^6 = 1_000_000_000)
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = ts::take_from_sender<TreasuryCap<MOCK_USDC>>(&scenario);
            
            mock_usdc::mint(
                &mut treasury,
                1_000_000_000, // 1000 USDC (6 decimals)
                ALICE,
                ts::ctx(&mut scenario)
            );
            
            ts::return_to_sender(&scenario, treasury);
        };
        
        // Alice should receive the coin
        ts::next_tx(&mut scenario, ALICE);
        {
            assert!(ts::has_most_recent_for_sender<Coin<MOCK_USDC>>(&scenario), 1);
            
            let coin = ts::take_from_sender<Coin<MOCK_USDC>>(&scenario);
            assert!(coin::value(&coin) == 1_000_000_000, 2);
            
            ts::return_to_sender(&scenario, coin);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_mint_multiple_times() {
        let mut scenario = ts::begin(ADMIN);
        
        // Initialize
        mock_usdc::init_for_testing(ts::ctx(&mut scenario));
        
        // Mint to Alice
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = ts::take_from_sender<TreasuryCap<MOCK_USDC>>(&scenario);
            
            mock_usdc::mint(&mut treasury, 500_000_000, ALICE, ts::ctx(&mut scenario));
            
            ts::return_to_sender(&scenario, treasury);
        };
        
        // Mint to Bob
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = ts::take_from_sender<TreasuryCap<MOCK_USDC>>(&scenario);
            
            mock_usdc::mint(&mut treasury, 300_000_000, BOB, ts::ctx(&mut scenario));
            
            ts::return_to_sender(&scenario, treasury);
        };
        
        // Verify Alice's balance
        ts::next_tx(&mut scenario, ALICE);
        {
            let coin = ts::take_from_sender<Coin<MOCK_USDC>>(&scenario);
            assert!(coin::value(&coin) == 500_000_000, 3);
            ts::return_to_sender(&scenario, coin);
        };
        
        // Verify Bob's balance
        ts::next_tx(&mut scenario, BOB);
        {
            let coin = ts::take_from_sender<Coin<MOCK_USDC>>(&scenario);
            assert!(coin::value(&coin) == 300_000_000, 4);
            ts::return_to_sender(&scenario, coin);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_burn() {
        let mut scenario = ts::begin(ADMIN);
        
        // Initialize
        mock_usdc::init_for_testing(ts::ctx(&mut scenario));
        
        // Mint to Alice
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = ts::take_from_sender<TreasuryCap<MOCK_USDC>>(&scenario);
            mock_usdc::mint(&mut treasury, 1_000_000_000, ALICE, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, treasury);
        };
        
        // Alice burns half her coins
        ts::next_tx(&mut scenario, ALICE);
        {
            let mut coin = ts::take_from_sender<Coin<MOCK_USDC>>(&scenario);
            let burn_coin = coin::split(&mut coin, 500_000_000, ts::ctx(&mut scenario));
            ts::return_to_sender(&scenario, coin);
            
            // Transfer burn_coin to admin for burning
            transfer::public_transfer(burn_coin, ADMIN);
        };
        
        // Admin burns the coin
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = ts::take_from_sender<TreasuryCap<MOCK_USDC>>(&scenario);
            let burn_coin = ts::take_from_sender<Coin<MOCK_USDC>>(&scenario);
            
            mock_usdc::burn(&mut treasury, burn_coin);
            
            ts::return_to_sender(&scenario, treasury);
        };
        
        // Verify Alice still has 500 USDC
        ts::next_tx(&mut scenario, ALICE);
        {
            let coin = ts::take_from_sender<Coin<MOCK_USDC>>(&scenario);
            assert!(coin::value(&coin) == 500_000_000, 5);
            ts::return_to_sender(&scenario, coin);
        };
        
        ts::end(scenario);
    }

    #[test]
    fun test_mint_zero_amount() {
        let mut scenario = ts::begin(ADMIN);
        
        // Initialize
        mock_usdc::init_for_testing(ts::ctx(&mut scenario));
        
        // Mint 0 USDC
        ts::next_tx(&mut scenario, ADMIN);
        {
            let mut treasury = ts::take_from_sender<TreasuryCap<MOCK_USDC>>(&scenario);
            
            mock_usdc::mint(&mut treasury, 0, ALICE, ts::ctx(&mut scenario));
            
            ts::return_to_sender(&scenario, treasury);
        };
        
        // Alice should receive a coin with 0 value
        ts::next_tx(&mut scenario, ALICE);
        {
            assert!(ts::has_most_recent_for_sender<Coin<MOCK_USDC>>(&scenario), 6);
            let coin = ts::take_from_sender<Coin<MOCK_USDC>>(&scenario);
            assert!(coin::value(&coin) == 0, 7);
            ts::return_to_sender(&scenario, coin);
        };
        
        ts::end(scenario);
    }
}
