import Redis from 'ioredis';
import * as os from 'node:os';

export class ServiceDiscovery {
    private redis: Redis;
    private instanceId: string;
    private readonly KEY_PREFIX = 'node-instances';
    private heartbeatInterval: NodeJS.Timeout | null = null;

    constructor() {
        this.redis = new Redis({
            host: 'redis',
            port: 6379
        });

        // Generate a unique ID for this instance
        this.instanceId = `${os.hostname()}-${process.pid}`;
    }

    async register(): Promise<void> {
        try {
            // Register this instance with a TTL of 30 seconds
            await this.redis.setex(`${this.KEY_PREFIX}:${this.instanceId}`, 30, 'active');

            // Start sending heartbeats
            this.heartbeatInterval = setInterval(async () => {
                await this.redis.setex(`${this.KEY_PREFIX}:${this.instanceId}`, 30, 'active');
            }, 20000); // Refresh every 20 seconds

            // Clean up on process exit
            process.on('SIGTERM', () => this.deregister());
            process.on('SIGINT', () => this.deregister());
        } catch (error) {
            console.error('Failed to register instance:', error);
        }
    }

    async deregister(): Promise<void> {
        try {
            if (this.heartbeatInterval) {
                clearInterval(this.heartbeatInterval);
            }
            await this.redis.del(`${this.KEY_PREFIX}:${this.instanceId}`);
            await this.redis.quit();
        } catch (error) {
            console.error('Failed to deregister instance:', error);
        }
    }

    async getActiveInstances(): Promise<number> {
        try {
            const keys = await this.redis.keys(`${this.KEY_PREFIX}:*`);
            return keys.length;
        } catch (error) {
            console.error('Failed to get active instances:', error);
            return 0;
        }
    }

    getInstanceId(): string {
        return this.instanceId;
    }
}

/**
 * Creates a delay for a specified number of milliseconds
 * @param ms - The number of milliseconds to delay (defaults to 5000ms/5 seconds)
 * @returns A promise that resolves after the specified delay
 */
export const delay = (ms: number = 5000): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

interface DistributedWorkerConfigWithWorkers {
    workers: number;
    maxWaitTime?: undefined;
}

interface DistributedWorkerConfigWithTimeout {
    workers?: undefined;
    maxWaitTime: number;
}

type DistributedWorkerConfig = DistributedWorkerConfigWithWorkers | DistributedWorkerConfigWithTimeout;

export async function DistributedWorker({workers, maxWaitTime = 10000}: DistributedWorkerConfig): Promise<ServiceDiscovery> {
    const serviceDiscovery = new ServiceDiscovery();
    await serviceDiscovery.register();

    const startTime = Date.now();
    let currentWorkers = 0;

    while (currentWorkers < workers && (Date.now() - startTime) < maxWaitTime) {
        const activeInstances = await serviceDiscovery.getActiveInstances();
        console.log(`Instance ${serviceDiscovery.getInstanceId()} is running`);
        console.log(`Total active instances: ${activeInstances}`);

        currentWorkers = activeInstances;
        await delay(500);
    }

    serviceDiscovery.deregister();

    return serviceDiscovery;
}