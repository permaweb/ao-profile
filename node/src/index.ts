import { promises as fs } from 'fs';
import { readFileSync } from 'fs';

import { connect, createDataItemSigner } from '@permaweb/aoconnect';

import { getGQLData, GATEWAYS } from './api';

const PROFILE_OWNER = JSON.parse(
	readFileSync('./wallets/profile-owner.json').toString(),
);

const AOS = {
	module: 'SBNb1qPQ1TDwpD_mboxm2YllmMLXpWw4U8P9Ff8W9vk',
	scheduler: '_GQ33BkPtZrqxA84vM8Zk-N2aO0toNNu_C-l-rawrBA',
};

function getTagValue(list: any, name: string) {
	for (let i = 0; i < list.length; i++) {
		if (list[i]) {
			if (list[i].name === name) {
				return list[i].value;
			}
		}
	}
	return null;
}

export async function readState(processId: string) {
	const aos = connect();

	const messageResult = await aos.dryrun({
		process: processId,
		tags: [{ name: 'Action', value: 'Info' }],
	});

	if (messageResult.Messages && messageResult.Messages.length && messageResult.Messages[0].Data) {
		return JSON.parse(messageResult.Messages[0].Data);
	}
}

export async function sendMessage(args: { processId: string, action: string, data: any, wallet: any }) {
	const aos = connect();

	try {
		const txId = await aos.message({
			process: args.processId,
			signer: createDataItemSigner(args.wallet),
			tags: [{ name: 'Action', value: args.action }],
			data: JSON.stringify(args.data)
		});

		const { Messages } = await aos.result({ message: txId, process: args.processId });

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
					catch {
						responseData = messageData;
					}
				}

				const responseStatus = getTagValue(message.Tags, 'Status');
				const responseMessage = getTagValue(message.Tags, 'Message');

				if (responseStatus && responseMessage) {
					console.log(`${responseStatus}: ${responseMessage}`);
				}

				response[action] = {
					id: txId,
					status: responseStatus,
					message: responseMessage,
					data: responseData
				}
			});

			console.log(`${args.action}: ${txId}`);
			return response;
		}
		else return null;
	}
	catch (e) {
		console.error(e);
	}
}

async function createProfile() {
	const aos = connect();
	const dateTime = new Date().getTime().toString();

	try {
		// TODO: fetch from arweave
		const processSrc: string = (await fs.readFile('../profile.lua', 'utf8' as any)).toString();

		const profileTags: { name: string; value: string }[] = [
			{ name: 'Date-Created', value: dateTime },
		];

		console.log('Spawning profile process...');
		const processId = await aos.spawn({
			module: AOS.module,
			scheduler: AOS.scheduler,
			signer: createDataItemSigner(PROFILE_OWNER),
			tags: profileTags,
		});

		console.log(`Process Id -`, processId);

		console.log('Fetching profile process...');
		let fetchedAssetId: string;
		let retryCount: number = 0;
		while (!fetchedAssetId) {
			await new Promise((r) => setTimeout(r, 2000));
			const gqlResponse = await getGQLData({
				gateway: GATEWAYS.arweave,
				ids: [processId],
				tagFilters: null,
				owners: null,
				cursor: null,
			});

			if (gqlResponse && gqlResponse.data.length) {
				console.log(`Fetched transaction -`, gqlResponse.data[0].node.id);
				fetchedAssetId = gqlResponse.data[0].node.id;
			} else {
				console.log(`Transaction not found -`, processId);
				retryCount++;
				if (retryCount >= 30) {
					throw new Error(`Transaction not found after 30 attempts, aborting`);
				}
			}
		}

		console.log('Sending source eval...');
		const evalMessage = await aos.message({
			process: processId,
			signer: createDataItemSigner(PROFILE_OWNER),
			tags: [{ name: 'Action', value: 'Eval' }],
			data: processSrc,
		});

		const evalResult = await aos.result({
			message: evalMessage,
			process: processId,
		});

		await new Promise((r) => setTimeout(r, 1000));

		console.log('Updating profile data...')
		let updateResponse = await sendMessage({
			processId: processId,
			action: 'Update-Profile',
			data: { Username: 'nickj203' },
			wallet: PROFILE_OWNER
		});

		console.log(updateResponse);

		await new Promise((r) => setTimeout(r, 1000));

		let profileState = await readState(processId);
		console.log(profileState);
	}
	catch (e: any) {
		console.error(e);
	}
}

(async function () {
	await createProfile();
})()