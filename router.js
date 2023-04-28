const fs = require('fs');
const dgram = require('dgram');

const ip_to_letter_map = {
    "127.0.0.1": "A",
    "127.0.0.2": "B",
    "127.0.0.3": "C",
    "127.0.0.4": "D",
    "127.0.0.5": "E",
    "127.0.0.6": "F"
}

class RouterNode {
    constructor(ip, port, routerTable) {
        this.port = port;
        this.socket = dgram.createSocket('udp4');
        this.routerTable = routerTable;
            this.ip = ip;
    }

    start() {
        // Start listening on the specified port
        this.socket.bind(this.port, this.ip);
        console.log(`\n=== ${this.ip} listening on port ${this.port} ===\n`);

        // Show routing table
        console.log(`Neighbors of ${ip_to_letter_map[this.ip]}:`);
        for (const neighbor in this.routerTable[this.ip]) {
            const cost = this.routerTable[this.ip][neighbor];
            // only show adjacent neighbors only
            if (cost !== "inf") {
                console.log(`  ${ip_to_letter_map[neighbor]}: ${cost}`);
            }
        }

        // Set up message listener
        this.socket.on('message', (msg, rinfo) => {
            this.handleMessage(msg, rinfo);
        });
    }


    handleMessage(msg, rinfo) {
        console.log(`Received message from ${rinfo.address}:${rinfo.port}: ${msg}`);
        // Handle the message and update the routing table as necessary
    }

    sendUpdate(router, neighbor, cost) {
        // const update = JSON.stringify({
        //   router: router,
        //   neighbor: neighbor,
        //   cost: cost
        // });
        // this.socket.send(update, this.port, this.routerTable[router][neighbor]);
    }
}

const configFile = './.config';
let port = process.argv[2];

// Read the configuration file
const configStr = fs.readFileSync(configFile).toString();
const routerTable = JSON.parse(configStr);

const routers = []

for (const ip in routerTable) {
    // console.log(`${ip}:${port}`)
    routers.push(new RouterNode(ip, port, routerTable))
    // increment port
    // port = (Number(port) + 1).toString()
}

// Start Routers
routers.forEach(router => {
    router.start()
})
