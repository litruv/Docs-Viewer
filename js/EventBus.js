/**
 * A simple publish-subscribe event bus for decoupled communication between components.
 * @class EventBus
 */
export class EventBus {
    constructor() {
        /** @type {Object.<string, Function[]>} */
        this.events = {};
    }

    /**
     * Subscribe to an event.
     * @param {string} event - The event name to subscribe to.
     * @param {Function} callback - The callback function to execute when the event is emitted.
     * @returns {Function} An unsubscribe function that removes this listener.
     */
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        return () => this.off(event, callback);
    }

    /**
     * Unsubscribe from an event.
     * @param {string} event - The event name to unsubscribe from.
     * @param {Function} callback - The callback function to remove.
     */
    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }

    /**
     * Emit an event to all subscribers.
     * @param {string} event - The event name to emit.
     * @param {*} data - The data to pass to all subscribers.
     */
    emit(event, data) {
        if (!this.events[event]) return;
        this.events[event].forEach(callback => callback(data));
    }
}
