import { CreateProfileArgs, EditProfileArgs } from './types';
declare const _default: {
    init: (deps: {
        ao: any;
        signer?: any;
        arweave?: any;
        profileSrc?: string;
        arweaveUrl?: string;
        graphqlUrl?: string;
        logging?: boolean;
        registry?: string;
    }) => {
        createProfile: (args: CreateProfileArgs) => Promise<string>;
        updateProfile: (args: EditProfileArgs) => Promise<string>;
        getProfileById: (args: {
            profileId: string;
        }) => Promise<import("./types").ProfileType | null>;
        getProfileByWalletAddress: (args: {
            address: string;
        }) => Promise<import("./types").ProfileType | null>;
        getRegistryProfiles: (args: {
            profileIds: string[];
        }) => Promise<import("./types").RegistryProfileType[]>;
    };
};
export default _default;
export * from './types';
