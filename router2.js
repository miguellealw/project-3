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

updates = 0

class RouterNode {
    constructor(ip, port, routerTable) {
        this.port = port;
        this.socket = dgram.createSocket('udp4');
        this.routerTable = routerTable; // routerTable maps IP to cost
        this.forwardingTable = {}; // forwardingTable maps IP to next forward
        this.neighbors = [];
        this.ip = ip;
    }

    start() {
        this.socket.bind(this.port, this.ip);
        console.log(`\n=== ${this.ip} listening on port ${this.port} ===\n`);
        console.log(`Neighbors of ${ip_to_letter_map[this.ip]}:`);

        for (const neighborNode in this.routerTable) {
            const cost = this.routerTable[neighborNode];

            // Only show adjacent neighbors that are reachable and not self
            if (cost !== "inf" && cost != 0) {
                // Add neighbor
                this.neighbors.push(neighborNode);
                // Update forwarding table with neighbor's address
                this.forwardingTable[neighborNode] = neighborNode; 
                console.log(`  ${ip_to_letter_map[neighborNode]}: ${cost}    (${neighborNode})`);
            }
            else if(cost == 0) {
                this.forwardingTable[neighborNode] = neighborNode;
            }
            else {
                this.forwardingTable[neighborNode] = null;
            }
        }

        console.log(`Router table of ${ip_to_letter_map[this.ip]}: (Initial)`)
        console.log(this.routerTable);
        console.log(`Forwarding table of ${ip_to_letter_map[this.ip]}: (Initial)`);
        console.log(this.forwardingTable);

        // Send updates to all neighbors to inform them of this node's address
        setTimeout(() => {
            for(const messageOf of this.neighbors) {
                for(const messageTo of this.neighbors) {
                    // Send an update to the neighbor
                    
                    // console.log(`${ip_to_letter_map[this.ip]} has a direct path to ${ip_to_letter_map[messageOf]} of cost ${this.routerTable[messageOf]}`)
                    this.sendUpdate(messageOf, this.routerTable[messageOf], messageTo);
                    
                }
            }
        }, 100)
        

        // Set up message listener
        this.socket.on('message', (msg, rinfo) => {
            this.handleMessage(msg, rinfo);
        });
    }

    handleMessage(messageJSON, rinfo) {
        const message = JSON.parse(messageJSON);
        const sender = message.router;
        const node = message.neighbor;
        const cost = message.cost;

        const costToSender = this.routerTable[sender];

        // Log the message:
        // console.log(`${ip_to_letter_map[sender]} has a path to ${ip_to_letter_map[node]} of cost ${cost}`)

        if(this.routerTable[node] == "inf" || costToSender + cost < this.routerTable[node])
        {
            this.routerTable[node] = costToSender + cost;
            this.forwardingTable[node] = sender;
            console.log(`Updated cost from ${ip_to_letter_map[this.ip]} to ${ip_to_letter_map[node]}`);
            console.log(`Updates: ${++updates}`)
            console.log("Router table: ", this.routerTable);
            console.log("Forwarding table: ", this.forwardingTable);

            for(const neighbor of this.neighbors)
            {
                this.sendUpdate(node, this.routerTable[node], neighbor);
            }
        }

        
    }

    sendUpdate(neighbor, cost, sendTo) {
        const update = JSON.stringify({
          router: this.ip,
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
    router.start();    
})

// while(updates < 20)
// {

// }
// routers.forEach(router => {
//     router.stop();
// })

