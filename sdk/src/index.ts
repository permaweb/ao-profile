import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import { getGQLData, messageResult } from './helpers';
import { AO, ARWEAVE_ENDPOINT, GATEWAYS } from './config';
import { CreateProfileArgs, EditProfileArgs } from './types';

// create tests/test
// fix up readme
// publish
// getRegistryProfiles getProfileByWalletAddress getProfileById

function createProfileWith(deps: { 
  ao: any,
  arweaveUrl: string,
  graphqlUrl: string
}) : (args: CreateProfileArgs) => Promise<string> {
  return async (args: CreateProfileArgs): Promise<string> => {
    try {
      let profileSrc = args.profileSrc ? args.profileSrc : AO.profileSrc;
      const processSrcFetch = await fetch(`${deps.arweaveUrl}/${profileSrc}`);
  
      if (!processSrcFetch.ok) throw new Error('Error fetching the process source code.');
  
      let processSrc = await processSrcFetch.text();
  
      const dateTime = new Date().getTime().toString();
  
      const profileTags: { name: string; value: string }[] = [
        { name: 'Date-Created', value: dateTime },
        { name: 'Action', value: 'Create-Profile' },
      ];
  
      console.log('Spawning profile process...');
      const processId = await deps.ao.spawn({
        module: args.module ? args.module : AO.module,
        scheduler: args.scheduler ? args.scheduler : AO.scheduler,
        signer: createDataItemSigner(args.wallet),
        tags: profileTags,
        data: args.data,
      });
  
      console.log(`Process Id -`, processId);
  
      console.log('Fetching profile process...');
      let fetchedAssetId: string | null = null;
      let retryCount: number = 0;
      while (!fetchedAssetId) {
        await new Promise((r) => setTimeout(r, 2000));
        const gqlResponse = await getGQLData({
          gateway: deps.graphqlUrl,
          ids: [processId],
          tagFilters: null,
          owners: null,
          cursor: null,
        });
  
        if (gqlResponse && gqlResponse.data.length) {
          console.log(`Fetched transaction -`, gqlResponse.data[0].node.id);
          fetchedAssetId = gqlResponse.data[0].node.id;
        } else {
          console.log(`Transaction not found -`, processId);
          retryCount++;
          if (retryCount >= 200) {
            throw new Error(`Profile not found, please try again`);
          }
        }
      }
      
      console.log('Sending source eval...');
      const evalMessage = await deps.ao.message({
        process: processId,
        signer: createDataItemSigner(args.wallet),
        tags: [{ name: 'Action', value: 'Eval' }],
        data: processSrc,
      });
  
      console.log(evalMessage);
  
      const evalResult = await deps.ao.result({
        message: evalMessage,
        process: processId,
      });
  
      console.log(evalResult);
  
      await new Promise((r) => setTimeout(r, 1000));
  
      console.log('Updating profile data...');

      await messageResult({
        processId: processId,
        action: 'Update-Profile',
        tags: null,
        data: args.data,
        wallet: args.wallet,
        ao: deps.ao,
        createDataItemSigner
      });

      return processId;
    } catch (e: any) {
      throw new Error(e);
    }
  }
}

function updateProfileWith(deps: { 
  ao: any
 }): (args: EditProfileArgs) => Promise<string> {
  return async (args: EditProfileArgs): Promise<string> => {
    let updateResponse = await messageResult({
      processId: args.profileId,
      action: 'Update-Profile',
      tags: [{ name: 'ProfileProcess', value: args.profileId }],
      data: args.data,
      wallet: args.wallet,
      ao: deps.ao,
      createDataItemSigner
    });
    return updateResponse.id;
  }
}

export const initialize = (args: { 
  profileSrc?: string,
  arweaveUrl?: string,
  graphqlUrl?: string
}) => {
  let aoDefault: any = connect();

  return {
    create: createProfileWith({ 
      ao: aoDefault,
      arweaveUrl: args.arweaveUrl ? args.arweaveUrl : ARWEAVE_ENDPOINT, 
      graphqlUrl: args.graphqlUrl ? args.graphqlUrl : GATEWAYS.goldsky,
    }),
    update: updateProfileWith({
      ao: aoDefault
    })
  }
};