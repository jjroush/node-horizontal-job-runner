// Function that prints hello world
import {DistributedWorker} from "./service-discovery.ts";

function sayHello(name: string = "World"): void {
    console.log(`Hello, ${name}!`);
}

const serviceDiscovery = await DistributedWorker({
    workers: 4
});

console.log('hit');