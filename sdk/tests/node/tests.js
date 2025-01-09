import { readFileSync } from 'fs';
import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import AOProfile from '@permaweb/aoprofile';
import Arweave from 'arweave';

const ao = connect();
const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET, 'utf-8'));
const signer = createDataItemSigner(wallet);
const arweave = Arweave.init();
const { 
  createProfile, 
  updateProfile, 
} = AOProfile.init({ ao, signer, arweave, logging: true });

const { 
  getProfileById, 
  getProfileByWalletAddress, 
  getRegistryProfiles 
} = AOProfile.init({ ao, logging: true });

async function runTests() {
  const data = {
    userName: "Test User Name",
    displayName: "Test Display Name",
    banner: "3LtGcZeZwAvbbjUZeUK0DhcRRHeN4KvJ4FlHNPt0gc8",
    thumbnail: "3LtGcZeZwAvbbjUZeUK0DhcRRHeN4KvJ4FlHNPt0gc8",
    description: "test profile"
  }

  const profileId = await createProfile({
    data
  });
  
  console.log(`Profile id: ${profileId}`);

  data.displayName = "Test Display Name Update";

  const updateTx = await updateProfile({
    profileId,
    data
  });

  console.log(`Update tx id: ${updateTx}`);

  const profileResponse = await getProfileById({ profileId });

  console.log(`Profile by id response`);
  console.log(profileResponse);

  const byWalletResponse = await getProfileByWalletAddress({ address: profileResponse.walletAddress });

  console.log(`Profile by wallet response`);
  console.log(byWalletResponse);

  const registryProfiles = await getRegistryProfiles({ profileIds: [profileId] });

  console.log(`Registry Profiles response`)
  console.log(registryProfiles)
}

runTests();