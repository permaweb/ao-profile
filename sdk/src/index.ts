import { getGQLData, messageResult, uppercaseKeys } from './helpers';
import { AO, ARWEAVE_ENDPOINT, GATEWAYS } from './config';
import { CreateProfileArgs, EditProfileArgs } from './types';
import { getByIdWith, getByWalletWith, getRegistryProfilesWith } from 'queries';

// TODO
// getRegistryProfiles getProfileByWalletAddress getProfileById
// Take raw media data as input (permaweb-libs has a resolveTx function that handles this)
// fix up readme
// publish

function createProfileWith(deps: { 
  ao: any,
  signer: any,
  arweaveUrl: string,
  graphqlUrl: string,
  logging?: boolean
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
  
      if(deps.logging) console.log('Spawning profile process...');
      const processId = await deps.ao.spawn({
        module: args.module ? args.module : AO.module,
        scheduler: args.scheduler ? args.scheduler : AO.scheduler,
        signer: deps.signer,
        tags: profileTags,
        data: JSON.stringify(uppercaseKeys(args.data)),
      });
  
      if(deps.logging) console.log(`Process Id -`, processId);
  
      if(deps.logging) console.log('Fetching profile process...');
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
          if(deps.logging) console.log(`Fetched transaction -`, gqlResponse.data[0].node.id);
          fetchedAssetId = gqlResponse.data[0].node.id;
        } else {
          if(deps.logging) console.log(`Transaction not found -`, processId);
          retryCount++;
          if (retryCount >= 200) {
            throw new Error(`Profile not found, please try again`);
          }
        }
      }
      
      if(deps.logging) console.log('Sending source eval...');
      const evalMessage = await deps.ao.message({
        process: processId,
        signer: deps.signer,
        tags: [{ name: 'Action', value: 'Eval' }],
        data: processSrc,
      });
  
      if(deps.logging) console.log(evalMessage);
  
      const evalResult = await deps.ao.result({
        message: evalMessage,
        process: processId,
      });
  
      if(deps.logging) console.log(evalResult);
  
      await new Promise((r) => setTimeout(r, 1000));
  
      if(deps.logging) console.log('Updating profile data...');

      await messageResult({
        processId: processId,
        action: 'Update-Profile',
        tags: null,
        data: JSON.stringify(uppercaseKeys(args.data)),
        ao: deps.ao,
        signer: deps.signer
      });

      return processId;
    } catch (e: any) {
      throw new Error(e);
    }
  }
}

function updateProfileWith(deps: { 
  ao: any,
  signer: any,
  logging?: boolean
 }): (args: EditProfileArgs) => Promise<string> {
  return async (args: EditProfileArgs): Promise<string> => {
    if(deps.logging) console.log(`Updating Profile ${args.profileId}`);
    let updateResponse = await messageResult({
      processId: args.profileId,
      action: 'Update-Profile',
      tags: [{ name: 'ProfileProcess', value: args.profileId }],
      data: JSON.stringify(uppercaseKeys(args.data)),
      ao: deps.ao,
      signer: deps.signer
    });
    return updateResponse['Profile-Success']?.id;
  }
}

export const initAOProfile = (deps: { 
  ao: any,
  signer: any,
  profileSrc?: string,
  arweaveUrl?: string,
  graphqlUrl?: string,
  logging?: boolean,
  registry?: string,
}) => {
  return {
    createProfile: createProfileWith({ 
      ao: deps.ao,
      signer: deps.signer,
      arweaveUrl: deps?.arweaveUrl ? deps.arweaveUrl : ARWEAVE_ENDPOINT, 
      graphqlUrl: deps?.graphqlUrl ? deps.graphqlUrl : GATEWAYS.goldsky,
      logging: deps.logging
    }),
    updateProfile: updateProfileWith({
      ao: deps.ao,
      signer: deps.signer,
      logging: deps.logging
    }),
    getProfileById: getByIdWith({ ao: deps.ao, registry: deps.registry }),
    getProfileByWalletAddress: getByWalletWith({ ao: deps.ao, registry: deps.registry }),
    getRegistryProfiles: getRegistryProfilesWith({ ao: deps.ao, registry: deps.registry })
  }
};

export * from './types';