import { readFileSync } from 'fs';
import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import { initAOProfile } from '@permaweb/ao-profile';

const ao = connect();
const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET, 'utf-8'));
const signer = createDataItemSigner(wallet);
const { 
  createProfile, 
  updateProfile, 
  getProfileById, 
  getProfileByWalletAddress, 
  getRegistryProfiles 
} = initAOProfile({ ao, signer, logging: true });

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