export const SUPPORTED_NETWORKS = {
	1: "MAINNET",
	56: "BSC",
	137: "POLYGON",
	1285: "moonriver",
	5: "GOERLI",
	97: "BSCTEST",
	80001: "MUMBAI",
	1287: "moonbase-alphanet",
	1337: true ? "POLYGON" : "MAINNET", // ! test network
};

export const MAINNET = {
	1: 'MAINNET',
	56: 'BSC',
	1285: 'MOONRIVER',
	137: 'POLYGON',
	1337: true ? "POLYGON" : "MAINNET", // ! test network
};

export const TESTNET = {
	5: 'GOERLI',
	97: 'BSCTEST',
	1287: 'moonbase-alphanet',
	80001: 'MUMBAI'
};

export const DEXNET = {
	1285: 'MOONRIVER',
	137: 'POLYGON',
	1287: 'moonbase-alphanet',
	80001: 'MUMBAI'
};

export const UNPOPULARNET = {
	1285: 'MOONRIVER',
	1287: 'moonbase-alphanet',
};

export const isExchageNetwork = (networkId) => {
	return Object.keys(DEXNET).find(key => Number(key) === networkId) !== undefined;
}