# @permaweb/aoprofile

This SDK provides a set of functions to interact with profile processes on AO. Profiles are a digital representation of entities, such as users, organizations, or channels. These processes include specific metadata that describes the entity and can be associated with various digital assets and collections. Profiles are created, updated, and fetched using the following functions.

## Prerequisites

- `node >= v18.0`
- `npm` or `yarn`
- `@permaweb/aoconnect`

## Installation

```bash
npm install @permaweb/aoprofile
```

or

```bash
yarn add @permaweb/aoprofile
```

## Initialization

```typescript
import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import Arweave from 'arweave';
import AOProfile from '@permaweb/aoprofile';

const ao = connect();
const signer = createDataItemSigner(window.arweaveWallet);

// Note: arweave is only required for uploading files via data urls, not if 
// sending txid's as the images to createProfile and updateProfile,
// signer is required for all uses of createProfile and updateProfile
const { 
  createProfile, 
  updateProfile,
  getProfileById, 
  getProfileByWalletAddress, 
  getRegistryProfiles
} = AOProfile.init({
	ao,
	signer,
	logging: true,
  arweave: Arweave.init()
});

// Queries do not require a signer or arweave
const { 
  getProfileById, 
  getProfileByWalletAddress, 
  getRegistryProfiles 
} = AOProfile.init({
	ao,
	logging: true,
});
```

## Usage

#### `createProfile`

Creates a profile, initializing a zone with specific profile relevant metadata. Note: using data urls for images will not work in NodeJS they will only work in a browser.

```typescript
const profileId = await createProfile({
	userName: 'Sample username',
	displayName: 'Sample display name',
	description: 'Sample description',
	thumbnail: 'Profile image data (can be a browser data url like data: or an Arweave txid)',
	banner: 'Cover image data (can be a browser data url like data: or an Arweave txid)',
});
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing profile details, including `username`, `displayName`, `description`, `thumbnail`, and `banner`

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
string | null; // Profile ID or null if creation fails
```

</details>

#### `updateProfile`

Updates a profile by modifying its metadata, such as `username`, `displayName`, `description`, and optional image fields like `thumbnail` and `banner`.

```typescript
const profileUpdateId = await updateProfile({
	profileId: profileId,
	userName: 'Sample Zone',
	displayName: 'Sample Zone',
	description: 'Sample description (can be a browser data url like data: or an Arweave txid)',
	thumbnail: 'Profile image data (can be a browser data url like data: or an Arweave txid)',
	banner: 'Cover image data',
});
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: The correspending Profile ID, as well as the details to update, structured similarly to `createProfile`

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
string | null; // Profile update ID or null if update fails
```

</details>

#### `getProfileById`

Fetches a profile based on its ID. Returns a structured profile object containing the profile’s metadata, assets, and other properties associated with the profile.

```typescript
const profile = await getProfileById({ profileId });
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing the ID to fetch specified by `profileId`

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
{
  id: "ProfileProcessId",
  walletAddress: "WalletAddress",
	displayName: "Sample display name",
  username: "Sample username",
  description: "Sample description",
  thumbnail: "ThumbnailTxId",
  banner: "BannerTxId",
  assets: [
    "AssetProcessId1",
    "AssetProcessId2",
    "AssetProcessId3",
  ]
}
```

</details>

#### `getProfileByWalletAddress`

Fetches a profile using the wallet address associated with it. This function is useful for retrieving a profile when only the wallet address is known.

```typescript
const profile = await getProfileByWalletAddress({ address: walletAddress });
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing the wallet address to fetch specified by `address`

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
{
  id: "ProfileProcessId",
  walletAddress: "WalletAddress",
	displayName: "Sample display name",
  username: "Sample username",
  description: "Sample description",
  thumbnail: "ThumbnailTxId",
  banner: "BannerTxId",
  assets: [
    "AssetProcessId1",
    "AssetProcessId2",
    "AssetProcessId3",
  ]
}
```

</details>

#### `getRegistryProfiles`

This function queries a profile registry process that contains information on all spawned AO profiles.

```typescript
const profiles = await getRegistryProfiles({ profileIds: [ids] });
```

<details>
  <summary><strong>Parameters</strong></summary>

- `args`: Object containing the ids to fetch specified by `profileIds`

</details>

<details>
  <summary><strong>Response</strong></summary>

```typescript
[
  {
    id: 'ProfileProcessId',
    username: 'Sample username',
    thumbnail: 'ThumbnailTxId',
    description: 'Sample description',
    lastUpdate: '1736293783295'
  }
]
```

</details>
