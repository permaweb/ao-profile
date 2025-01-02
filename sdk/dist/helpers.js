var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { PAGINATORS, CURSORS, GATEWAYS } from './config';
function getQueryBody(args) {
    const paginator = args.paginator ? args.paginator : PAGINATORS.default;
    const ids = args.ids ? JSON.stringify(args.ids) : null;
    let blockFilter = null;
    if (args.minBlock !== undefined && args.minBlock !== null) {
        blockFilter = {};
        blockFilter.min = args.minBlock;
    }
    const blockFilterStr = blockFilter ? JSON.stringify(blockFilter).replace(/"([^"]+)":/g, '$1:') : null;
    const tagFilters = args.tagFilters
        ? JSON.stringify(args.tagFilters)
            .replace(/"(name)":/g, '$1:')
            .replace(/"(values)":/g, '$1:')
            .replace(/"FUZZY_OR"/g, 'FUZZY_OR')
        : null;
    const owners = args.owners ? JSON.stringify(args.owners) : null;
    const cursor = args.cursor && args.cursor !== CURSORS.end ? `"${args.cursor}"` : null;
    let fetchCount = `first: ${paginator}`;
    let txCount = '';
    let nodeFields = `data { size type } owner { address } block { height timestamp }`;
    let order = '';
    switch (args.gateway) {
        case GATEWAYS.arweave:
            break;
        case GATEWAYS.goldsky:
            txCount = `count`;
            break;
    }
    let body = `
		transactions(
				ids: ${ids},
				tags: ${tagFilters},
				${fetchCount}
				owners: ${owners},
				block: ${blockFilterStr},
				after: ${cursor},
				${order}
				
			){
			${txCount}
				pageInfo {
					hasNextPage
				}
				edges {
					cursor
					node {
						id
						tags {
							name 
							value 
						}
						${nodeFields}
					}
				}
		}`;
    if (args.queryKey)
        body = `${args.queryKey}: ${body}`;
    return body;
}
function getResponse(args) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const response = yield fetch(`${args.gateway}/graphql`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: args.query,
            });
            return yield response.json();
        }
        catch (e) {
            throw e;
        }
    });
}
function getQuery(body) {
    const query = { query: `query { ${body} }` };
    return JSON.stringify(query);
}
export function getGQLData(args) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const paginator = args.paginator ? args.paginator : PAGINATORS.default;
        let data = [];
        let count = 0;
        let nextCursor = null;
        if (args.ids && !args.ids.length) {
            return { data: data, count: count, nextCursor: nextCursor, previousCursor: null };
        }
        try {
            let queryBody = getQueryBody(args);
            const response = yield getResponse({ gateway: args.gateway, query: getQuery(queryBody) });
            if (response.data.transactions.edges.length) {
                data = [...response.data.transactions.edges];
                count = (_a = response.data.transactions.count) !== null && _a !== void 0 ? _a : 0;
                const lastResults = data.length < paginator || !response.data.transactions.pageInfo.hasNextPage;
                if (lastResults)
                    nextCursor = CURSORS.end;
                else
                    nextCursor = data[data.length - 1].cursor;
                return {
                    data: data,
                    count: count,
                    nextCursor: nextCursor,
                    previousCursor: null,
                };
            }
            else {
                return { data: data, count: count, nextCursor: nextCursor, previousCursor: null };
            }
        }
        catch (e) {
            console.error(e);
            return { data: data, count: count, nextCursor: nextCursor, previousCursor: null };
        }
    });
}
export function getTagValue(list, name) {
    for (let i = 0; i < list.length; i++) {
        if (list[i]) {
            if (list[i].name === name) {
                return list[i].value;
            }
        }
    }
    return null;
}
export function messageResult(args) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const tags = [{ name: 'Action', value: args.action }];
            if (args.tags)
                tags.push(...args.tags);
            const data = args.useRawData ? args.data : JSON.stringify(args.data);
            const txId = yield args.ao.message({
                process: args.processId,
                signer: args.createDataItemSigner(args.wallet),
                tags: tags,
                data: data,
            });
            const { Messages } = yield args.ao.result({ message: txId, process: args.processId });
            if (Messages && Messages.length) {
                const response = {};
                Messages.forEach((message) => {
                    const action = getTagValue(message.Tags, 'Action') || args.action;
                    let responseData = null;
                    const messageData = message.Data;
                    if (messageData) {
                        try {
                            responseData = JSON.parse(messageData);
                        }
                        catch (_a) {
                            responseData = messageData;
                        }
                    }
                    const responseStatus = getTagValue(message.Tags, 'Status');
                    const responseMessage = getTagValue(message.Tags, 'Message');
                    response[action] = {
                        id: txId,
                        status: responseStatus,
                        message: responseMessage,
                        data: responseData,
                    };
                });
                return response;
            }
            else
                return null;
        }
        catch (e) {
            console.error(e);
        }
    });
}
//# sourceMappingURL=helpers.js.map