// we are not using this import it is so that
// the global.window.arweaveWallet code compiles
import Arweave from 'arweave';

import { 
  GQLArgsType, 
  GQLNodeResponseType, 
  DefaultGQLResponseType, 
  QueryBodyGQLArgsType,
  TagType
} from './types';
import { PAGINATORS, CURSORS, GATEWAYS, TAGS, UPLOAD } from './config';

function getQueryBody(args: QueryBodyGQLArgsType): string {
	const paginator = args.paginator ? args.paginator : PAGINATORS.default;
	const ids = args.ids ? JSON.stringify(args.ids) : null;
	let blockFilter: { min?: number; max?: number } | null = null;
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

	let fetchCount: string = `first: ${paginator}`;
	let txCount: string = '';
	let nodeFields: string = `data { size type } owner { address } block { height timestamp }`;
	let order: string = '';

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

	if (args.queryKey) body = `${args.queryKey}: ${body}`;

	return body;
}

async function getResponse(args: { gateway: string; query: string }): Promise<any> {
	try {
		const response = await fetch(`${args.gateway}/graphql`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: args.query,
		});
		return await response.json();
	} catch (e: any) {
		throw e;
	}
}

function getQuery(body: string): string {
	const query = { query: `query { ${body} }` };
	return JSON.stringify(query);
}

export async function getGQLData(args: GQLArgsType): Promise<DefaultGQLResponseType> {
  const paginator = args.paginator ? args.paginator : PAGINATORS.default;

  let data: GQLNodeResponseType[] = [];
  let count: number = 0;
  let nextCursor: string | null = null;

  if (args.ids && !args.ids.length) {
    return { data: data, count: count, nextCursor: nextCursor, previousCursor: null };
  }

  try {
    let queryBody: string = getQueryBody(args);
    const response = await getResponse({ gateway: args.gateway, query: getQuery(queryBody) });

    if (response.data.transactions.edges.length) {
      data = [...response.data.transactions.edges];
      count = response.data.transactions.count ?? 0;

      const lastResults: boolean = data.length < paginator || !response.data.transactions.pageInfo.hasNextPage;

      if (lastResults) nextCursor = CURSORS.end;
      else nextCursor = data[data.length - 1].cursor;

      return {
        data: data,
        count: count,
        nextCursor: nextCursor,
        previousCursor: null,
      };
    } else {
      return { data: data, count: count, nextCursor: nextCursor, previousCursor: null };
    }
  } catch (e: any) {
    console.error(e);
    return { data: data, count: count, nextCursor: nextCursor, previousCursor: null };
  }
}

export function getTagValue(list: { [key: string]: any }[], name: string): string | null {
	for (let i = 0; i < list.length; i++) {
		if (list[i]) {
			if (list[i]!.name === name) {
				return list[i]!.value as string;
			}
		}
	}
	return null;
}

export async function messageResult(args: {
	processId: string;
	action: string;
	tags: TagType[] | null;
	data: string;
  ao: any;
  signer: any;
}): Promise<any> {
	try {
		const tags = [{ name: 'Action', value: args.action }];
		if (args.tags) tags.push(...args.tags);

		const data = args.data;

		const txId = await args.ao.message({
			process: args.processId,
			signer: args.signer,
			tags: tags,
			data: data,
		});

		const { Messages } = await args.ao.result({ message: txId, process: args.processId });

		if (Messages && Messages.length) {
			const response: any = {};

			Messages.forEach((message: any) => {
				const action = getTagValue(message.Tags, 'Action') || args.action;

				let responseData = null;
				const messageData = message.Data;

				if (messageData) {
					try {
						responseData = JSON.parse(messageData);
					} catch {
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
		} else return null;
	} catch (e) {
		console.error(e);
	}
}

export function uppercaseKeys(obj: any) {
  return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
          key.charAt(0).toUpperCase() + key.slice(1),
          value
      ])
  );
}

export function checkValidAddress(address: string | null) {
	if (!address) return false;
	return /^[a-z0-9_-]{43}$/i.test(address);
}

export function getBase64Data(dataURL: string) {
	return dataURL.split(',')[1];
}

export function getDataURLContentType(dataURL: string) {
	const result = dataURL.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,/);
	return result ? result[1] : null;
}

export function getByteSize(input: string | Buffer): number {
	let sizeInBytes: number;
	if (Buffer.isBuffer(input)) {
		sizeInBytes = input.length;
	} else if (typeof input === 'string') {
		sizeInBytes = Buffer.byteLength(input, 'utf-8');
	} else {
		throw new Error('Input must be a string or a Buffer');
	}

	return sizeInBytes;
}

export async function createTransaction(args: {
	data: any;
  arweave: any;
	tags?: TagType[];
	uploadMethod?: 'default' | 'turbo';
}): Promise<string> {
	let content: any = null;
	let contentType: string | null = null;

	try {
		if (typeof args.data === 'string' && args.data.startsWith('data:')) {
			content = Buffer.from(getBase64Data(args.data), 'base64');
			contentType = getDataURLContentType(args.data);
		}
	}
	catch (e: any) {
		throw new Error(e);
	}

	if (content && contentType) {
		const contentSize: number = getByteSize(content);

		if (contentSize < Number(UPLOAD.dispatchUploadSize)) {
			const tx = await args.arweave.createTransaction({ data: content }, 'use_wallet');
			tx.addTag(TAGS.keys.contentType, contentType)
			if (args.tags && args.tags.length > 0) args.tags.forEach((tag: TagType) => tx.addTag(tag.name, tag.value));

      if(global.window && global.window.arweaveWallet) {
        const response = await global.window.arweaveWallet.dispatch(tx);
        return response.id;
      }

      return '';
		}
		else {
			throw new Error('Data exceeds max upload limit'); // TODO
		}
	}
	else {
		throw new Error('Error preparing transaction data');
	}
}

export function resolveTransactionWith(deps: { arweave: any }) {
  return async (data: any): Promise<string> => {
    if(!data) return '';
    if (checkValidAddress(data)) { return data }
    else if(!deps.arweave) { throw new Error(`Must initialize with Arweave in order to upload data`) }
    else {
      try {
        return await createTransaction({ data: data, arweave: deps.arweave });
      } catch (e: any) {
        throw new Error(e.message ?? 'Error resolving transaction');
      }
    }
  }
}