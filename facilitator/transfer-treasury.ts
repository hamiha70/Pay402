import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';
import { SuiGrpcClient } from '@mysten/sui/grpc';

const TREASURY_CAP = '0x21aa4203c1f95e3e0584624b274f3e5c630578efaba76bb47d53d5d7421fde11';
const DEPLOYER = '0x7a332ba4bd8ba826101ec340009a66b83e9480f35b4c0780c12f324c1aa10dc7';
const FACILITATOR_KEY = 'suiprivkey1qpxdxgs7f4hu7qx9pkchgz2w454t45hthra2p2hlfg7xscjf5qv8y8cjc0c';

async function transferTreasuryCap() {
  const client = new SuiGrpcClient({ network: 'testnet', baseUrl: 'http://127.0.0.1:9000' });
  const keypair = Ed25519Keypair.fromSecretKey(FACILITATOR_KEY);

  console.log('Transferring treasury cap from facilitator to deployer...');
  console.log('From:', keypair.getPublicKey().toSuiAddress());
  console.log('To:', DEPLOYER);

  const tx = new Transaction();
  tx.transferObjects([tx.object(TREASURY_CAP)], DEPLOYER);

  const result = await client.signAndExecuteTransaction({
    transaction: tx,
    signer: keypair,
  });

  console.log('✅ Treasury cap transferred!');
  console.log('Digest:', result.$kind === 'Transaction' ? result.Transaction.digest : 'unknown');
}

transferTreasuryCap().catch(console.error);
