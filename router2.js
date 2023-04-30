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

function prettifyRoutingTable(table) {
    const prettyTable = {}

    for (node in table) {
        const ipLetter = ip_to_letter_map[node]
        prettyTable[ipLetter] = table[node]
    }

    return JSON.stringify(prettyTable, null, 4);
}

function prettifyForwardingTable(table) {
    const prettyTable = {}

    for (node in table) {
        const ipFromLetter = ip_to_letter_map[node]
        const ipToLetter = ip_to_letter_map[table[node]]
        prettyTable[ipFromLetter] = ipToLetter
    }

    return JSON.stringify(prettyTable, null, 4);
}

let updates = 0
const visited = []

class RouterNode {
    constructor(ip, port, routerTable) {
        this.port = port;
        this.socket = dgram.createSocket('udp4');
        this.routerTable = routerTable; // routerTable maps IP to cost
        this.forwardingTable = {}; // forwardingTable maps IP to next forward
        this.neighbors = [];
        this.ip = ip;
        this.isRunning = false;
    }

    start() {
        this.socket.bind(this.port, this.ip);
        this.isRunning = true;
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
        console.log(prettifyRoutingTable(this.routerTable));
        console.log(`Forwarding table of ${ip_to_letter_map[this.ip]}: (Initial)`);
        console.log(prettifyForwardingTable(this.forwardingTable));

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

    stop() {
        if (this.isRunning) {
            this.socket.close();
            console.log(`Stopped listening on port ${this.port} for ${this.ip}`);
            this.isRunning = false;
        } else {
            console.log(`${this.ip} is not running`)
        }
    }

    handleMessage(messageJSON, rinfo) {
        const message = JSON.parse(messageJSON);
        const isUpdate = message.isUpdate;

        // Check if it is a router table update or a message sent after convergence (for test 1)
        if(isUpdate) {
            // console.log(`Update ${this.ip}`)
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
                console.log(`\nUpdated cost from ${ip_to_letter_map[this.ip]} to ${ip_to_letter_map[node]}`);
                console.log(`Updates: ${++updates}`)
                console.log("Router table: ", prettifyRoutingTable(this.routerTable));
                console.log("Forwarding table: ", prettifyForwardingTable(this.forwardingTable));

                for(const neighbor of this.neighbors) {
                    this.sendUpdate(node, this.routerTable[node], neighbor);
                }

                if (updates >= 27) {
                    console.log("\n=== CONVERGED ===\n")
                }

            }
        } else {
            // It is a message after convergence
            const {routerName, ip, port, utaId, date, updates, paylaodSize} = message;
            console.log(`\n=== Test Case 1 for ${ip} / ${ip_to_letter_map[ip]} ===\n`)
            console.log(`Router Name: ${routerName} | IP: ${ip} | Port: ${port}`);
            console.log(`UTA ID: ${utaId}`);
            console.log(`Date: ${date}`);
            console.log(`Updates: ${updates}`)
            // console.log(`Size of Payload: ${paylaodSize}`)
            console.log(`\n`)

            // for(const neighbor of this.neighbors) {
            //     this.sendMessageAfterConvergence(neighbor);
            // }
        }

        // Converged
        // console.log("UPDATES", updates)
        if (updates >= 27) {
            // for(const neighbor of this.neighbors) {
            for(const neighbor in this.forwardingTable) {
                const dest = this.forwardingTable[neighbor]
                if (!visited.includes(this.ip)) {
                    // this.sendMessageAfterConvergence(neighbor);
                    this.sendMessageAfterConvergence(dest);
                    visited.push(this.ip)
                }
            }

            // console.log(`${this.ip}`, this.forwardingTable)

            // stopAllRouters()
        }

        
    }

    sendUpdate(neighbor, cost, sendTo) {
        // Only allow sending when the socket is running.
        // If the check is not done, it would cause an error, due to the timeout above, because
        // it would try sending data after the timeout elapsed, but the socket was already closed.
        if(this.isRunning) {
            const update = JSON.stringify({
              router: this.ip,
              neighbor: neighbor,
              cost: cost,
              isUpdate: true
            });
            this.socket.send(update, this.port, sendTo);
        }
    }

    // sendMessageAfterConvergence(neighbor, sendTo) {
    sendMessageAfterConvergence(sendTo, payloadSize=0) {
        if(this.isRunning) {
            const message = JSON.stringify({
                routerName: ip_to_letter_map[this.ip],
                ip: this.ip,
                port: this.port,
                utaId: "1001837419 and TODO",
                date: new Date().toUTCString(),
                updates: updates,
                isUpdate: false,
                // payload: payload ??
                // paylaodSize: payloadSize
            });

            this.socket.send(message, this.port, sendTo);
        }

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

// while(updates < 20) {
// }

function stopAllRouters() {
    routers.forEach(router => {
        router.stop();
    })
}

