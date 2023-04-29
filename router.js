const fs = require('fs');
const dgram = require('dgram');
const { throws } = require('assert');
const { runInThisContext } = require('vm');

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
        this.forwardingTable = {}
        this.ip = ip;
    }

    start() {
        // Start listening on the specified port
        this.socket.bind(this.port, this.ip);
        console.log(`\n=== ${this.ip} listening on port ${this.port} ===\n`);
        const neighbors = [];
        // Show routing table
        console.log(`Neighbors of ${ip_to_letter_map[this.ip]}:`);

        // Loop through the router table to find adjacent neighbors
        for (const neighbor in this.routerTable) {
            const cost = this.routerTable[neighbor];

            // Only show adjacent neighbors that are reachable and not self
            if (cost !== "inf" && cost != 0) {
                neighbors.push(neighbor);
                // Update forwarding table with neighbor's address
                this.forwardingTable[neighbor] = neighbor; 
                console.log(`  ${ip_to_letter_map[neighbor]}: ${cost}`);
            }
        }

        console.log(this.routerTable);

        // Send updates to all neighbors to inform them of this node's address
        for(const messageOf of neighbors) {
            for(const messageTo of neighbors) {
                // Send an update to the neighbor
                this.sendUpdate(this.ip, messageOf, this.routerTable[messageTo], messageTo);
            }
        }

        // Set up message listener
        this.socket.on('message', (msg, rinfo) => {
            this.handleMessage(msg, rinfo);
        });
    }


    handleMessage(msg, rinfo) {
        console.log(`Received message from ${ ip_to_letter_map[rinfo.address]} to ${ip_to_letter_map[this.ip]} ${msg}`);
        const message = JSON.parse(msg);
        const sender = rinfo.address;
        const cost = message.cost;

        const costToSender = this.routerTable[sender];
        
        const node = message.neighbor;

        // If the forwarding table does not contain the node, add it
        if (! Object.keys(this.forwardingTable).includes(node)) {
            this.forwardingTable[node] = cost;
        } else {
            // If the forwarding table already contains the node, update the cost if it is lower
            if(this.forwardingTable[cost] > costToSender + cost) {
                this.forwardingTable[cost] = costToSender + cost;
                console.log("Updated cost.")

                // Send an update to all neighbors
                const messageOf = node;
                for(const messageTo of neighbors) {
                    this.sendUpdate(this.ip, messageOf, this.routerTable[messageTo], messageTo);
                }
                
            }
        }
    }

    sendUpdate(router, neighbor, cost, sendTo) {
        const update = JSON.stringify({
          router: router,
          neighbor: neighbor,
          cost: cost
        });
        this.socket.send(update, this.port, sendTo);
    }
}

const configFile = './.config';
const port = process.argv[2];

// Read the configuration file
const configStr = fs.readFileSync(configFile).toString();
const routerTable = JSON.parse(configStr);

const routers = []

// Create and store routers
for (const ip in routerTable) {
    // console.log(`${ip}:${port}`)
    routers.push(new RouterNode(ip, port, routerTable[ip]))
    // increment port
    // port = (Number(port) + 1).toString()
}

// Start Routers
routers.forEach(router => {
    router.start()
})
