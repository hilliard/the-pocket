import { EventEmitter } from 'events';

// Create a singleton instance of EventEmitter to act as our global message bus
// In a single-node deployment (like Coolify), this works perfectly.
// If scaling horizontally across multiple servers, this would be replaced with Redis Pub/Sub.
export const eventBus = new EventEmitter();

// Increase max listeners if we expect many connections
eventBus.setMaxListeners(100);
