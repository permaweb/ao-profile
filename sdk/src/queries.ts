import { ProfileType, TagType, RegistryProfileType } from "types";
import { AO } from "config";

export async function readHandler(args: {
  ao: any;
	processId: string;
	action: string;
	tags?: TagType[];
	data?: any;
}): Promise<any> {
	const tags = [{ name: 'Action', value: args.action }];
	if (args.tags) tags.push(...args.tags);
	let data = JSON.stringify(args.data || {});

	const response = await args.ao.dryrun({
		process: args.processId,
		tags: tags,
		data: data,
	});

	if (response.Messages && response.Messages.length) {
		if (response.Messages[0].Data) {
			return JSON.parse(response.Messages[0].Data);
		} else {
			if (response.Messages[0].Tags) {
				return response.Messages[0].Tags.reduce((acc: any, item: any) => {
					acc[item.name] = item.value;
					return acc;
				}, {});
			}
		}
	}
}

export function getByIdWith(deps: { ao: any, registry?: string }) {
  return async (args: { profileId: string }): Promise<ProfileType | null> => {
    const emptyProfile: ProfileType = {
      id: args.profileId,
      walletAddress: null,
      displayName: null,
      username: null,
      description: null,
      thumbnail: null,
      banner: null,
      version: null,
    };
  
    try {
      const fetchedProfile = await readHandler({
        processId: args.profileId,
        action: 'Info',
        data: null,
        ao: deps.ao
      });
  
      if (fetchedProfile) {
        return {
          id: args.profileId,
          walletAddress: fetchedProfile.Owner || null,
          displayName: fetchedProfile.Profile.DisplayName || null,
          username: fetchedProfile.Profile.UserName || null,
          description: fetchedProfile.Profile.Description || null,
          thumbnail: fetchedProfile.Profile.ProfileImage || null,
          banner: fetchedProfile.Profile.CoverImage || null,
          version: fetchedProfile.Profile.Version || null,
          assets: fetchedProfile.Assets?.map((asset: { Id: string; Quantity: string }) => asset.Id) ?? [],
        };
      } else { 
        return emptyProfile 
      };
    } catch (e: any) {
      throw new Error(e);
    }
  }
}

export function getByWalletWith(deps: { ao: any, registry?: string }) {
  return async(args: { address: string }): Promise<ProfileType | null> => {
    const emptyProfile: ProfileType = {
      id: null,
      walletAddress: args.address,
      displayName: null,
      username: null,
      description: null,
      thumbnail: null,
      banner: null,
      version: null,
    };
  
    try {
      const profileLookup = await readHandler({
        processId: deps.registry ? deps.registry : AO.profileRegistry,
        action: 'Get-Profiles-By-Delegate',
        data: { Address: args.address },
        ao: deps.ao
      });
  
      let activeProfileId: string | null = null;
      if (profileLookup && profileLookup.length > 0 && profileLookup[0].ProfileId) {
        activeProfileId = profileLookup[0].ProfileId;
      }
  
      if (activeProfileId) {
        const fetchedProfile = await readHandler({
          processId: activeProfileId,
          action: 'Info',
          data: null,
          ao: deps.ao
        });
  
        if (fetchedProfile) {
          const userProfile = {
            id: activeProfileId,
            walletAddress: fetchedProfile.Owner || null,
            displayName: fetchedProfile.Profile.DisplayName || null,
            username: fetchedProfile.Profile.UserName || null,
            description: fetchedProfile.Profile.Description || null,
            thumbnail: fetchedProfile.Profile.ProfileImage || null,
            banner: fetchedProfile.Profile.CoverImage || null,
            version: fetchedProfile.Profile.Version || null,
            assets: fetchedProfile.Assets?.map((asset: { Id: string; Quantity: string }) => asset.Id) ?? [],
          };
  
          return userProfile;
        } else return emptyProfile;
      } else return emptyProfile;
    } catch (e: any) {
      throw new Error(e);
    }
  }
}

export function getRegistryProfilesWith(deps: { ao: any, registry?: string }) {
  return async (args: { profileIds: string[] }): Promise<RegistryProfileType[]> => {
    try {
      const metadataLookup = await readHandler({
        processId: deps.registry ? deps.registry : AO.profileRegistry,
        action: 'Get-Metadata-By-ProfileIds',
        data: { ProfileIds: args.profileIds },
        ao: deps.ao
      });
  
      if (metadataLookup && metadataLookup.length) {
        return args.profileIds.map((profileId: string) => {
          const profile = metadataLookup.find((profile: { ProfileId: string }) => profile.ProfileId === profileId);
          return {
            id: profile ? profile.ProfileId : profileId,
            username: profile ? profile.Username : null,
            thumbnail: profile ? profile.ProfileImage : null,
            description: profile ? profile.Description ?? null : null,
            lastUpdate: Date.now().toString(),
          };
        });
      }
  
      return [];
    } catch (e: any) {
      throw new Error(e);
    }
  }
}