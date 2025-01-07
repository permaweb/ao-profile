import { ProfileType, TagType, RegistryProfileType } from "types";
export declare function readHandler(args: {
    ao: any;
    processId: string;
    action: string;
    tags?: TagType[];
    data?: any;
}): Promise<any>;
export declare function getByIdWith(deps: {
    ao: any;
    registry?: string;
}): (args: {
    profileId: string;
}) => Promise<ProfileType | null>;
export declare function getByWalletWith(deps: {
    ao: any;
    registry?: string;
}): (args: {
    address: string;
}) => Promise<ProfileType | null>;
export declare function getRegistryProfilesWith(deps: {
    ao: any;
    registry?: string;
}): (args: {
    profileIds: string[];
}) => Promise<RegistryProfileType[]>;
