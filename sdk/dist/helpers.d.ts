import { GQLArgsType, DefaultGQLResponseType, TagType } from './types';
export declare function getGQLData(args: GQLArgsType): Promise<DefaultGQLResponseType>;
export declare function getTagValue(list: {
    [key: string]: any;
}[], name: string): string | null;
export declare function messageResult(args: {
    processId: string;
    action: string;
    tags: TagType[] | null;
    data: string;
    ao: any;
    signer: any;
}): Promise<any>;
export declare function uppercaseKeys(obj: any): {
    [k: string]: unknown;
};
