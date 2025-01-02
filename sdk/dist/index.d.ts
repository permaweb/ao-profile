import { CreateProfileArgs, EditProfileArgs } from './types';
export declare const initialize: (args: {
    profileSrc?: string;
    arweaveUrl?: string;
    graphqlUrl?: string;
}) => {
    create: (args: CreateProfileArgs) => Promise<string>;
    update: (args: EditProfileArgs) => Promise<string>;
};
