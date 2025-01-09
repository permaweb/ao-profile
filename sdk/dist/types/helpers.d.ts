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
export declare function checkValidAddress(address: string | null): boolean;
export declare function getBase64Data(dataURL: string): string;
export declare function getDataURLContentType(dataURL: string): string | null;
export declare function getByteSize(input: string | Buffer): number;
export declare function createTransaction(args: {
    data: any;
    arweave: any;
    tags?: TagType[];
    uploadMethod?: 'default' | 'turbo';
}): Promise<string>;
export declare function resolveTransactionWith(deps: {
    arweave: any;
}): (data: any) => Promise<string>;
