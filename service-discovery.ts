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