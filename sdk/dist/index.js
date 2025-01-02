var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { connect, createDataItemSigner } from '@permaweb/aoconnect';
import { getGQLData, messageResult } from './helpers';
import { AO, ARWEAVE_ENDPOINT, GATEWAYS } from './config';
// create tests/test
// fix up readme
// publish
// getRegistryProfiles getProfileByWalletAddress getProfileById
function createProfileWith(deps) {
    return (args) => __awaiter(this, void 0, void 0, function* () {
        try {
            let profileSrc = args.profileSrc ? args.profileSrc : AO.profileSrc;
            const processSrcFetch = yield fetch(`${deps.arweaveUrl}/${profileSrc}`);
            if (!processSrcFetch.ok)
                throw new Error('Error fetching the process source code.');
            let processSrc = yield processSrcFetch.text();
            const dateTime = new Date().getTime().toString();
            const profileTags = [
                { name: 'Date-Created', value: dateTime },
                { name: 'Action', value: 'Create-Profile' },
            ];
            console.log('Spawning profile process...');
            const processId = yield deps.ao.spawn({
                module: args.module ? args.module : AO.module,
                scheduler: args.scheduler ? args.scheduler : AO.scheduler,
                signer: createDataItemSigner(args.wallet),
                tags: profileTags,
                data: args.data,
            });
            console.log(`Process Id -`, processId);
            console.log('Fetching profile process...');
            let fetchedAssetId = null;
            let retryCount = 0;
            while (!fetchedAssetId) {
                yield new Promise((r) => setTimeout(r, 2000));
                const gqlResponse = yield getGQLData({
                    gateway: deps.graphqlUrl,
                    ids: [processId],
                    tagFilters: null,
                    owners: null,
                    cursor: null,
                });
                if (gqlResponse && gqlResponse.data.length) {
                    console.log(`Fetched transaction -`, gqlResponse.data[0].node.id);
                    fetchedAssetId = gqlResponse.data[0].node.id;
                }
                else {
                    console.log(`Transaction not found -`, processId);
                    retryCount++;
                    if (retryCount >= 200) {
                        throw new Error(`Profile not found, please try again`);
                    }
                }
            }
            console.log('Sending source eval...');
            const evalMessage = yield deps.ao.message({
                process: processId,
                signer: createDataItemSigner(args.wallet),
                tags: [{ name: 'Action', value: 'Eval' }],
                data: processSrc,
            });
            console.log(evalMessage);
            const evalResult = yield deps.ao.result({
                message: evalMessage,
                process: processId,
            });
            console.log(evalResult);
            yield new Promise((r) => setTimeout(r, 1000));
            console.log('Updating profile data...');
            yield messageResult({
                processId: processId,
                action: 'Update-Profile',
                tags: null,
                data: args.data,
                wallet: args.wallet,
                ao: deps.ao,
                createDataItemSigner
            });
            return processId;
        }
        catch (e) {
            throw new Error(e);
        }
    });
}
function updateProfileWith(deps) {
    return (args) => __awaiter(this, void 0, void 0, function* () {
        let updateResponse = yield messageResult({
            processId: args.profileId,
            action: 'Update-Profile',
            tags: [{ name: 'ProfileProcess', value: args.profileId }],
            data: args.data,
            wallet: args.wallet,
            ao: deps.ao,
            createDataItemSigner
        });
        return updateResponse.id;
    });
}
export const initialize = (args) => {
    let aoDefault = connect();
    return {
        create: createProfileWith({
            ao: aoDefault,
            arweaveUrl: args.arweaveUrl ? args.arweaveUrl : ARWEAVE_ENDPOINT,
            graphqlUrl: args.graphqlUrl ? args.graphqlUrl : GATEWAYS.goldsky,
        }),
        update: updateProfileWith({
            ao: aoDefault
        })
    };
};
//# sourceMappingURL=index.js.map