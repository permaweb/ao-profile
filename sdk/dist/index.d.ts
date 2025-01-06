import { CreateProfileArgs, EditProfileArgs } from './types';
export declare const init: (deps: {
    ao: any;
    signer: any;
    profileSrc?: string;
    arweaveUrl?: string;
    graphqlUrl?: string;
    logging?: boolean;
    registry?: string;
}) => {
    create: (args: CreateProfileArgs) => Promise<string>;
    update: (args: EditProfileArgs) => Promise<string>;
    getById: (args: {
        profileId: string;
    }) => Promise<import("./types").ProfileType | null>;
    getByWallet: (args: {
        address: string;
    }) => Promise<import("./types").ProfileType | null>;
    getRegistryProfiles: (args: {
        profileIds: string[];
    }) => Promise<import("./types").RegistryProfileType[]>;
};
export * from 'types';
