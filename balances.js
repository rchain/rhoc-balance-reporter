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

const deployAddr       = '0x168296bb09e24a88805cb9c33356536b980d3fc5'
const deployBlock      = 3383352
const tokenMintAddr    = '0xe17C20292b2F1b0Ff887Dc32A73C259Fae25f03B'
const tokenSupply      = 100000000000000000

const apiUrl    = process.env.ETH_API_URL || process.env.ETH_WS || 'http://localhost:8545'
const toBlock	= process.env.BLOCK || 'latest';
const dumpXfers = !!process.env.DUMP_XFERS
const chunkSize = process.env.CHUNK_SIZE || 1000000

const web3 = new Web3(apiUrl)
const rhoc = new web3.eth.Contract(require('./abi.json'), deployAddr);

async function* getTransferEvents(_toBlock) {

	async function* getTransferEventsInRange(fromBlock, toBlock) {
		for (ev of await rhoc.getPastEvents('Transfer', { fromBlock, toBlock } )) {
			if (ev.blockNumber === null) {
				console.warning('Got pending transfer event, skipping...')
				continue
			}
			yield ev
		}
	}

	let count = _toBlock - deployBlock + 1

	let iters = Math.floor(count / chunkSize)
	for (let i = 0; i < iters; i++) {
		let fromBlock = deployBlock + i * chunkSize
		let toBlock   = deployBlock + (i + 1) * chunkSize - 1
		yield* getTransferEventsInRange(fromBlock, toBlock)
	}

	let fromBlock = _toBlock - count % chunkSize + 1
	if (fromBlock <= _toBlock)
		yield* getTransferEventsInRange(fromBlock, _toBlock)
}

async function* getNetBalances(xferEventsIter) {
	let balances = new Map()
	balances[tokenMintAddr] = BigInt(tokenSupply)

	for await (ev of xferEventsIter) {
		let xfer = ev.returnValues
		if (xfer.from === xfer.to)
			continue
		let amount  = BigInt(xfer.value)
		let fromBal = balances[xfer.from] || 0n // BigInt(0)
		let toBal   = balances[xfer.to]   || 0n
		balances[xfer.from] = fromBal - amount
		balances[xfer.to]   = toBal   + amount
	}

	for ([addr, bal] of Object.entries(balances)) {
		if (bal > 0) {
			let c = await web3.eth.getCode(addr).then(code => code == '0x' ? 0 : 1)
			yield [addr, bal, c]
		}
	}
}

(async () => {
	let exitCode = 0
	try {
		let xferEventsIter = getTransferEvents(toBlock)
		if (dumpXfers) {
			for await (xferEvent of xferEventsIter) {
				console.log(JSON.stringify(xferEvent))
			}
		} else {
			for await ([addr, bal, c] of getNetBalances(xferEventsIter)) {
				process.stdout.write(addr + ',' + bal + ',' + c + '\n')
			}
		}
	} catch (e) {
		console.error(e)
		exitCode = 1
	} finally {
		process.exit(exitCode)
	}
})();
