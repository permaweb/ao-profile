# AO Profile

This library is for creating, updating, and querying the current profile implementation running on AO.

## SDK 

Initializing the library

```js
import { readFileSync } from 'fs';
import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import { init } from '@permaweb/aoprofile';

const ao = connect();
const wallet = JSON.parse(readFileSync(process.env.PATH_TO_WALLET, 'utf-8'));
const signer = createDataItemSigner(wallet);
const { 
  create, 
  update, 
  getById, 
  getByWallet, 
  getRegistryProfiles 
} = init({ ao, signer, logging: true });

// there other optional parameters to init:
// profileSrc, arweaveUrl, graphqlUrl, and registry (the id of the profile registry)

```

Creating and Editing Profiles, use the functions initialized above.
```js
const data = {
  userName: "Test User Name",
  displayName: "Test Display Name",
  coverImage: "3LtGcZeZwAvbbjUZeUK0DhcRRHeN4KvJ4FlHNPt0gc8",
  profileImage: "3LtGcZeZwAvbbjUZeUK0DhcRRHeN4KvJ4FlHNPt0gc8",
  description: "test profile"
}

const profileId = await create({
  data
});

data.displayName = "Test Display Name Update";

const updateTx = await update({
  profileId,
  data
});
```

Querying Profiles and the Profile Registry, use the functions initialized above.

```js
const profileResponse = await getById({ profileId });

console.log(`Profile by id response`);
console.log(profileResponse);

const byWalletResponse = await getByWallet({ address: profileResponse.walletAddress });

console.log(`Profile by wallet response`);
console.log(byWalletResponse);

const registryProfiles = await getRegistryProfiles({ profileIds: [profileId] });

console.log(`Registry Profiles response`)
console.log(registryProfiles)
```