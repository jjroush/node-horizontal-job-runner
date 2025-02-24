// Function that prints hello world
import {ServiceDiscovery} from "./service-discovery.ts";

function sayHello(name: string = "World"): void {
    console.log(`Hello, ${name}!`);
}

/**
 * Creates a delay for a specified number of milliseconds
 * @param ms - The number of milliseconds to delay (defaults to 5000ms/5 seconds)
 * @returns A promise that resolves after the specified delay
 */
export const delay = (ms: number = 5000): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

const serviceDiscovery = new ServiceDiscovery();
// @ts-ignore
await serviceDiscovery.register();


let workers = 0;

while (workers < Number(process.env.WORKERS) /* || 15 seconds of delay */) {
    // @ts-ignore
    const activeInstances = await serviceDiscovery.getActiveInstances();
    console.log(`Instance ${serviceDiscovery.getInstanceId()} is running`);
    console.log(`Total active instances: ${activeInstances}`);

    console.log(typeof workers, typeof process.env.WORKERS)

    workers = activeInstances;

    await delay(500);
}

await serviceDiscovery.deregister();

console.log('hit');