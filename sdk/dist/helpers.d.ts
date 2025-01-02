import { GQLArgsType, DefaultGQLResponseType, TagType } from './types';
export declare function getGQLData(args: GQLArgsType): Promise<DefaultGQLResponseType>;
export declare function getTagValue(list: {
    [key: string]: any;
}[], name: string): string | null;
export declare function messageResult(args: {
    processId: string;
    wallet: any;
    action: string;
    tags: TagType[] | null;
    data: any;
    useRawData?: boolean;
    ao: any;
    createDataItemSigner: any;
}): Promise<any>;
