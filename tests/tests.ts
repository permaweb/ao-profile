

// import { readFileSync } from 'fs';

import { initialize } from '@permaweb/ao-profile';


const { create, update } = initialize({  });

// (async function () {
//   const wallet = JSON.parse(readFileSync(
//     process.env.PATH_TO_WALLET ? process.env.PATH_TO_WALLET : 'wallet.json'
//   ).toString());

//   const data = "asdf";

//   console.log(wallet);

//   // const profileId = await create({
//   //   wallet,
//   //   data
//   // });

//   // console.log(profileId);
// })();
