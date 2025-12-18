import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

const WEBSOCKET_URL = process.env.REACT_APP_WS_URL !== undefined
    ? process.env.REACT_APP_WS_URL
    : 'http://localhost:8081/ws';

class WebSocketService {
    constructor() {
        this.client = null;
        this.subscriptions = {};
        this.connected = false;
        this.onConnectedCallback = null;
    }

    connect(onConnected, onError) {
        this.onConnectedCallback = onConnected;

        this.client = new Client({
            webSocketFactory: () => new SockJS(WEBSOCKET_URL),
            reconnectDelay: 5000,
            heartbeatIncoming: 4000,
            heartbeatOutgoing: 4000,
            onConnect: () => {
                console.log('WebSocket connected');
                this.connected = true;
                if (this.onConnectedCallback) {
                    this.onConnectedCallback();
                }
            },
            onStompError: (frame) => {
                console.error('STOMP error:', frame);
                if (onError) onError(frame);
            },
            onDisconnect: () => {
                console.log('WebSocket disconnected');
                this.connected = false;
            },
            onWebSocketClose: () => {
                console.log('WebSocket closed');
                this.connected = false;
            }
        });

        this.client.activate();
    }

    disconnect() {
        if (this.client) {
            Object.values(this.subscriptions).forEach(sub => {
                try {
                    sub.unsubscribe();
                } catch (e) {
                    console.warn('Unsubscribe error:', e);
                }
            });
            this.subscriptions = {};
            this.client.deactivate();
            this.connected = false;
        }
    }

    subscribeToTeam(teamId, onMessage) {
        const destination = `/topic/team/${teamId}`;

        // Unsubscribe from previous subscription if exists
        if (this.subscriptions[destination]) {
            try {
                this.subscriptions[destination].unsubscribe();
            } catch (e) {
                console.warn('Unsubscribe error:', e);
            }
            delete this.subscriptions[destination];
        }

        if (this.client && this.connected) {
            console.log('Subscribing to:', destination);
            this.subscriptions[destination] = this.client.subscribe(
                destination,
                (message) => {
                    try {
                        const event = JSON.parse(message.body);
                        console.log('Received event:', event);
                        onMessage(event);
                    } catch (e) {
                        console.error('Error parsing WebSocket message:', e);
                    }
                }
            );
        } else {
            console.warn('Cannot subscribe - not connected');
        }
    }

    unsubscribeFromTeam(teamId) {
        const destination = `/topic/team/${teamId}`;
        if (this.subscriptions[destination]) {
            try {
                this.subscriptions[destination].unsubscribe();
            } catch (e) {
                console.warn('Unsubscribe error:', e);
            }
            delete this.subscriptions[destination];
        }
    }

    isConnected() {
        return this.connected;
    }

    getClient() {
        return this.client;
    }

    // Presence methods for online status tracking
    joinTeamPresence(teamId, memberNo) {
        if (this.client && this.connected) {
            this.client.publish({
                destination: `/app/presence/join/${teamId}`,
                body: JSON.stringify({ memberNo })
            });
        }
    }

    leaveTeamPresence(teamId) {
        if (this.client && this.connected) {
            this.client.publish({
                destination: `/app/presence/leave/${teamId}`,
                body: JSON.stringify({})
            });
        }
    }
}

const websocketService = new WebSocketService();
export default websocketService;
