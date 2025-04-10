import { Buffer } from 'buffer';
import { getGQLData, messageResult, resolveTransactionWith, uppercaseKeys } from './helpers';
import { AO, ARWEAVE_ENDPOINT, GATEWAYS } from './config';
import { CreateProfileArgs, EditProfileArgs } from './types';
import { getByIdWith, getByWalletWith, getRegistryProfilesWith } from 'queries';

if (!globalThis.Buffer) globalThis.Buffer = Buffer;

function createProfileWith(deps: {
	ao: any,
	signer?: any,
	arweaveUrl: string,
	graphqlUrl: string,
	logging?: boolean,
	resolveTransaction: any
}): (args: CreateProfileArgs) => Promise<string> {
	return async (args: CreateProfileArgs): Promise<string> => {
		try {
			if (!deps.signer) throw new Error(`Must initialize with a signer to create profiles`);
			let profileSrc = args.profileSrc ? args.profileSrc : AO.profileSrc;
			const processSrcFetch = await fetch(`${deps.arweaveUrl}/${profileSrc}`);

			if (!processSrcFetch.ok) throw new Error('Error fetching the process source code.');

			let processSrc = await processSrcFetch.text();

			const dateTime = new Date().getTime().toString();

			const profileTags: { name: string; value: string }[] = [
				{ name: 'Date-Created', value: dateTime },
				{ name: 'Action', value: 'Create-Profile' },
			];

			const { thumbnail, banner, ...newObj } = args.data;

			let finalData = {
				...newObj,
				ProfileImage: await deps.resolveTransaction(thumbnail),
				CoverImage: await deps.resolveTransaction(banner)
			};

			if (deps.logging) console.log('Spawning profile process...');
			const processId = await deps.ao.spawn({
				module: args.module ? args.module : AO.module,
				scheduler: args.scheduler ? args.scheduler : AO.scheduler,
				signer: deps.signer,
				tags: profileTags,
				data: JSON.stringify(uppercaseKeys(finalData)),
			});

			if (deps.logging) console.log(`Process Id -`, processId);

			if (deps.logging) console.log('Sending source eval...');
			const evalMessage = await deps.ao.message({
				process: processId,
				signer: deps.signer,
				tags: [{ name: 'Action', value: 'Eval' }],
				data: processSrc,
			});

			if (deps.logging) console.log(evalMessage);

			const evalResult = await deps.ao.result({
				message: evalMessage,
				process: processId,
			});

			if (deps.logging) console.log(evalResult);

			await new Promise((r) => setTimeout(r, 1000));

			if (deps.logging) console.log('Updating profile data...');

			await messageResult({
				processId: processId,
				action: 'Update-Profile',
				tags: null,
				data: JSON.stringify(uppercaseKeys(finalData)),
				ao: deps.ao,
				signer: deps.signer
			});

			return processId;
		} catch (e: any) {
			throw new Error(e);
		}
	}
}

function updateProfileWith(deps: {
	ao: any,
	signer: any,
	logging?: boolean,
	resolveTransaction: any
}): (args: EditProfileArgs) => Promise<string> {
	return async (args: EditProfileArgs): Promise<string> => {
		if (!deps.signer) throw new Error(`Must initialize with a signer to update profiles`);
		if (deps.logging) console.log(`Updating Profile ${args.profileId}`);

		const { thumbnail, banner, ...newObj } = args.data;

		let finalData = {
			...newObj,
			ProfileImage: await deps.resolveTransaction(thumbnail),
			CoverImage: await deps.resolveTransaction(banner)
		};

		let updateResponse = await messageResult({
			processId: args.profileId,
			action: 'Update-Profile',
			tags: [{ name: 'ProfileProcess', value: args.profileId }],
			data: JSON.stringify(uppercaseKeys(finalData)),
			ao: deps.ao,
			signer: deps.signer
		});
		return updateResponse['Profile-Success']?.id;
	}
}

const init = (deps: {
	ao: any,
	signer?: any,
	arweave?: any,
	profileSrc?: string,
	arweaveUrl?: string,
	graphqlUrl?: string,
	logging?: boolean,
	registry?: string,
}) => {
	return {
		createProfile: createProfileWith({
			ao: deps.ao,
			signer: deps.signer,
			arweaveUrl: deps?.arweaveUrl ? deps.arweaveUrl : ARWEAVE_ENDPOINT,
			graphqlUrl: deps?.graphqlUrl ? deps.graphqlUrl : GATEWAYS.goldsky,
			logging: deps.logging,
			resolveTransaction: resolveTransactionWith({
				arweave: deps.arweave
			})
		}),
		updateProfile: updateProfileWith({
			ao: deps.ao,
			signer: deps.signer,
			logging: deps.logging,
			resolveTransaction: resolveTransactionWith({
				arweave: deps.arweave
			})
		}),
		getProfileById: getByIdWith({ ao: deps.ao, registry: deps.registry }),
		getProfileByWalletAddress: getByWalletWith({ ao: deps.ao, registry: deps.registry }),
		getRegistryProfiles: getRegistryProfilesWith({ ao: deps.ao, registry: deps.registry })
	}
};

export default {
	init
};

export * from './types';