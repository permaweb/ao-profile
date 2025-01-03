export type TagFilterType = { name: string; values: string[]; match?: string };

export type BaseGQLArgsType = {
  ids: string[] | null;
  tagFilters: TagFilterType[] | null;
  owners: string[] | null;
  cursor: string | null;
  paginator?: number;
  minBlock?: number;
  maxBlock?: number;
};

export type QueryBodyGQLArgsType = BaseGQLArgsType & { gateway?: string; queryKey?: string };

export type GQLArgsType = { gateway: string } & BaseGQLArgsType;

export type TagType = { name: string; value: string };

export type GQLNodeResponseType = {
  cursor: string | null;
  node: {
    id: string;
    tags: TagType[];
    data: {
      size: string;
      type: string;
    };
    block?: {
      height: number;
      timestamp: number;
    };
    owner?: {
      address: string;
    };
    address?: string;
    timestamp?: number;
  };
};

export type GQLResponseType = {
  count: number;
  nextCursor: string | null;
  previousCursor: string | null;
};

export type DefaultGQLResponseType = {
  data: GQLNodeResponseType[];
} & GQLResponseType;

export type CreateProfileArgs = {
  data: ProfileInput,
  profileSrc?: string,
  module?: string,
  scheduler?: string,
};

export type EditProfileArgs = { 
  profileId: string, 
  data: ProfileInput 
};

export type ProfileInput = {
  userName: string,
  displayName?: string,
  coverImage?: string,
  profileImage?: string,
  description?: string
}

export type ProfileType = {
	id: string | null;
	walletAddress: string| null;
	displayName: string | null;
	username: string | null;
	bio: string | null;
	avatar: string | null;
	banner: string | null;
	version: string | null;
	assets?: string[];
};

export type RegistryProfileType = {
	id: string;
	avatar: string | null;
	username: string;
	bio?: string;
	lastUpdate?: number;
};