## rrc

Generate a balance report for the RHOC REV conversion. Outputs a list of all
keys along with RHOC balance (in wei) and a 0|1 flag to indicate whether or not
there is a contract at that address.

### Note on the use of this software
This tool is provided on an "as is" basis, without warranties or conditions of any kind. We strongly recommend users to validate results. We take no responsibilty for any loss incurred through the use of this code.

### Setup

You need Node.js 11.x. Clone the repo and run npm install from the project root:

```bash
$ git clone https://github.com/rchain/rhoc-balance-reporter.git
$ cd rhoc-balance-reporter
$ npm install
```

### Generate a RHOC balance report

Specify options by setting shell variables:

```bash
BLOCK=<block height>
ETH_WS=<websockets provider>
```

Eth provider defaults to local node (`ws://localhost:8546`).

```bash
$ BLOCK=7588056 node balances >wallets_7588056.txt
```

### Improvements

* Timestamp balances.csv output so that it can be included in version control.
