/// balances.js -- RHOC balance reporting

// Copyright (C) 2018 dc <dc@dapp.org>
// Copyright (C) 2019 Tomáš Virtus <tomas.virtus@rchain.coop>
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the Apache License as published by the Apache
// Software Foundation, either version 2 of the License, or (at your option)
// any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// Apache License, Version 2 for more details.
//
// You should have received a copy of the Apache License, Version 2
// along with this program. If not, see <https://www.apache.org/licenses/>.

const Web3 = require('web3');

const apiUrl    = process.env.ETH_API_URL || process.env.ETH_WS || 'http://localhost:8545'
const fromBlock = 3383352;
const toBlock	= process.env.BLOCK || 7588056;

const web3 = new Web3(apiUrl)
const rhoc = new web3.eth.Contract(require('./abi.json'), "0x168296bb09e24a88805cb9c33356536b980d3fc5");

async function* getKeys() {
	let keys = new Set()
	function* addKey(k) {
		if (!keys.has(k)) {
			keys.add(k)
			yield k
		}
	}
	for (t of await rhoc.getPastEvents('Transfer', { fromBlock, toBlock })) {
		yield* addKey(t.returnValues.from)
		yield* addKey(t.returnValues.to)
	}
}

async function* getBalances() {
	for await (key of getKeys()) {
		let bal = await rhoc.methods.balanceOf(key).call({}, toBlock)
		if (bal > 0) {
			let c = await web3.eth.getCode(key).then(code => code == '0x' ? 0 : 1)
			yield [key, bal, c]
		}
	}
}

(async () => {
	let exitCode = 0
	try {
		for await ([key, bal, c] of getBalances()) {
			process.stdout.write(key + ',' + bal + ',' + c + '\n')
		}
	} catch (e) {
		console.error(e)
		exitCode = 1
	} finally {
		process.exit(exitCode)
	}
})();
