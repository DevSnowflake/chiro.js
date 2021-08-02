import WebSocket from "ws";
import fetch, { Response } from "node-fetch";
import { Manager } from "./Manager";
import { Player } from "./Player";
import { NodeOptions, Payload, TrackData } from "../Static/Interfaces";
import { WSEvents, WSOpCodes } from "../Static/Constants";

function generateRandomPassword(): string {
    const characters = 'abcdefghijklmnopqrstuvwxyz123456789';
    let password = '';
    for (let i = 0; i < 22; i++) password += characters[Math.floor(Math.random() * characters.length)];
    return password;
}

/**
 * @typedef {Object} NodeOptions
 * @param {string} host='localhost' Hostname of Nexus Node
 * @param {number} port='3000' Port of Nexus
 * @param {string} password Password for Nexus
 * @param {boolean} secure=false If Nexus has ssl
 * @param {string} identifier IDentifier for nexus
 * @param {number} [retryAmount] Retry Amount
 * @param {number} [retryDelay] Retry Delay
 * @param {number} [requestTimeout] Request Timeout
 */

/**
 * The Node class which does the api management.
 */
export class Node {

    /**
     * Websocket of the node.
     * @type {WebSocket}
     */
    public socket: WebSocket | null = null;

    /**
     * The Manager of this node.
     * @type {Manager}
     */
    public manager: Manager;

    /**
     * Static manager for this node.
     * @type {Manager}
     * @ignore
     * @private
     */
    private static _manager: Manager;

    /**
     * Reconnect Timeout.
     * @type {NodeJS.Timeout}
     * @ignore
     * @private
     */
    private reconnectTimeout?: NodeJS.Timeout;

    /**
     * Number of reconnect attempts.
     * @type {number}
     * @ignore
     * @private
     */
    private reconnectAttempts: number = 1;

    /**
     * The constructor for the node.
     * 
     * @hideconstructor
     * @param {NodeOptions} options The options required for the Node.
     */
    constructor(public options: NodeOptions) {
        if (!this.manager) this.manager = Node._manager;
        if (!this.manager) throw new RangeError("Manager has not been initiated.");
        if (this.manager.node) return this.manager.node;

        this.options = {
            port: 3000,
            password: generateRandomPassword(),
            secure: false,
            retryAmount: 5,
            retryDelay: 30e3,
            ...options,
        };

        this.manager.node = this;
        this.manager.emit("nodeCreate", this);
    }

    /**
     * Returns a boolean stating is the socket connected or not.
     * 
     * @ignore
     * @returns {boolean}
     */
    public get connected(): boolean {
        return this.socket ? this.socket.readyState === WebSocket.OPEN : false;
    }

    /**
     * Inititate the static manager for this node.
     * 
     * @ignore
     * @param {Manager} manager Manager
     */
    public static initStaticManager(manager: Manager) {
        this._manager = manager;
    }

    /**
     * Creates a WS connection with the Websocket API.
     * @ignore
     */
    public connect() {
        if (this.connected) return;

        const headers = {
            Authorization: this.options.password,
            "client-id": this.manager.options.clientID,
        };

        this.socket = new WebSocket(
            `ws${this.options.secure ? "s" : ""}://${this.options.host}:${this.options.port}/`,
            { headers }
        );

        this.socket.on("open", this.open.bind(this));
        this.socket.on("close", this.close.bind(this));
        this.socket.on("message", this.message.bind(this));
        this.socket.on("error", this.error.bind(this));
    }

    /**
     * Destroys the Node and all players connected with it.
     */
    public destroy() {
        if (!this.connected) return;

        this.manager.players.forEach(p => {
            if (p.node == this) p.destroy();
        });

        this.socket.close(1000, "destroy");
        this.socket.removeAllListeners();
        this.socket = null;

        this.reconnectAttempts = 1;
        clearTimeout(this.reconnectTimeout);

        this.manager.emit("nodeDestroy", this);
        this.manager.destroyNode();
    }

    /**
     * Make a request to the Nexus Api.
     * 
     * @param {string} method The type of api request to be done.
     * @param {string} path The api url's path.
     * @param {Object} body The body of the request.
     * @returns {Promise<Response>}
     */
    public makeRequest(
        method: "GET" | "POST" | "PATCH" | "DELETE",
        path: string,
        body?: Record<string, unknown>
    ): Promise<Response> {
        const url =`http${this.options.secure ? "s" : ""}://${this.options.host}:${this.options.port}/${path}`;

        return fetch(url, {
            method,
            body: JSON.stringify(body || {}),
            headers: {
                Authorization: this.manager.access_token,
                "Content-Type": "application/json",
            },
        }); 
    }

    /**
     * Reconnect in to the Websocket if the connection fails.
     * 
     * @hidden
     * @ignore
     * @private
     */
    private reconnect() {
        if (!this.socket) return;

        this.reconnectTimeout = setTimeout(() => {
            if (this.reconnectAttempts >= this.options.retryAmount) {
                this.manager.emit("nodeError", this, new Error(`Unable to connect after ${this.options.retryAmount} attempts.`));
                return this.destroy();
            }
            
            this.socket.removeAllListeners();
            this.socket = null;
            this.manager.emit("nodeReconnect", this);
            this.connect();
            this.reconnectAttempts++;
        }, this.options.retryDelay);
    }

    /**
     * Open event for the websocket api.
     * 
     * @protected
     * @ignore
     */
    protected open() {
        if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
        this.manager.emit("nodeConnect", this);
    }

    /**
     * Close event for the websocket api.
     * 
     * @param {number} code Close code from the ws api.
     * @param {string} reason Reason for the closinf the ws connection.
     * @protected
     * @ignore
     */
    protected close(code: number, reason: string) {
        this.manager.emit("nodeDisconnect", this, { code, reason });
        if (code !== 1000 || reason !== "destroy") this.reconnect();
    }

    /**
     * Error event for the websocket api.
     * 
     * @param {Error} error Error from the socket.
     * @protected
     * @ignore
     */
    protected error(error: Error) {
        if (!error) return;
        this.manager.emit("nodeError", this, error);
    }

    /**
     * Message event from the websocket api.
     * 
     * @param {Buffer | string} d Data Buffer from the api.
     * @protected
     * @ignore
     */
    protected message(d: Buffer | string) {
        if (Array.isArray(d)) d = Buffer.concat(d);
        else if (d instanceof ArrayBuffer) d = Buffer.from(d);

        const payload: Payload = JSON.parse(d.toString());
        if (payload.op !== undefined) {
            switch (payload.op) {
                // @ts-ignore
                case WSOpCodes.HELLO:
                    this.manager.emit("nodeHello", this);
                    this.socket.send(JSON.stringify({ op: WSOpCodes.IDENTIFY }));
                    break;

                case WSOpCodes.VOICE_STATE_UPDATE:
                    this.manager.options.send(payload.d.d.guild_id, payload.d);
                    break;
                    
                default:
                    this.manager.emit("nodeUnknownOpcode", payload);
            }
        }

        if (payload.t !== undefined) {
            switch (payload.t) {
                case WSEvents.READY:
                    this.manager.access_token = payload.d.access_token;
                    this.manager.emit("ready", payload);
                    break;

                case WSEvents.VOICE_CONNECTION_READY:
                    this.manager.emit("voiceReady", payload);
                    break;

                case WSEvents.VOICE_CONNECTION_ERROR:
                    this.manager.emit("voiceError", payload);
                    break;

                case WSEvents.VOICE_CONNECTION_DISCONNECT:
                    this.manager.emit("voiceError", payload);
                    break;

                case WSEvents.AUDIO_PLAYER_ERROR:
                    this.manager.emit("audioPlayerError", payload);
                    break;

                default:
                    // The only events left are track events.
                    this.handleTrackEvent(payload);
            }
        }
    }

    /**
     * Handle all kind of track events.
     * 
     * @param {Payload} payload Payload from the websocket api.
     * @protected
     * @ignore
     */
    protected handleTrackEvent(payload: Payload) {
        const player = this.manager.players.get(payload.d.guild_id);
        if (!player) return;
        const track = player.queue.current;

        switch (payload.t) {
            case WSEvents.TRACK_START:
                player.playing = true;
                player.paused = false;
                this.manager.emit("trackStart", player, track, payload);
                break;

            case WSEvents.QUEUE_END:
                this.trackEnd(player, track, payload);
                break;

            case WSEvents.TRACK_ERROR:
                this.manager.emit("trackError", payload);
                this.trackEnd(player, track, payload);
                break;

            default:
                this.manager.emit("nodeUnknownEvent", payload);
        }
    }

    /**
     * Emit event for the TRACK_END event.
     * 
     * @param {Player} player The player.
     * @param {TrackData} track The data of the track.
     * @param {Payload} payload The payload from the ws api.
     * @protected
     * @ignore
     */
    protected trackEnd(player: Player, track: TrackData, payload: Payload) {
        if (!player.queue.length) return this.queueEnd(player, payload);
        if (track && player.trackRepeat) {
            if (!player.queue.current) return this.queueEnd(player, payload);
            this.manager.emit("trackEnd", player, track);
            return player.play();
        }

        player.queue.previous = player.queue.current;
        player.queue.current = player.queue.shift();

        if (track && player.queueRepeat) {
            if (!player.queue.current) return this.queueEnd(player, payload);
            player.queue.add(player.queue.previous);
            this.manager.emit("trackEnd", player, track);
            return player.play();
        }

        if (player.queue.length) {
            this.manager.emit("trackEnd", player, track);
            return player.play();
        }
    }

    /**
     * Emits the `queueEnd` event in the Manager.
     * 
     * @param {Player} player The player.
     * @param {Payload} payload The payload sent by the ws api.
     * @protected
     * @ignore
     */
    protected queueEnd(player: Player, payload: Payload) {
        this.manager.emit("queueEnd", player, payload);
    }

    /**
     * Send payload to the nexus using ws.
     * 
     * @param {Object} data Payload to send to the WS Api.
     * @returns {Promise<boolean>}
     * @example
     * const payload = {"op": 10, d: null}
     * <Player>.node.send(payload)
     */
    public send(data: unknown): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const stringified = JSON.stringify(data);
            if (!this.connected) return resolve(false);
            if (!data || !stringified.startsWith("{")) return reject(new Error('Improper data sent to send in the WS.')); 
            this.socket.send(stringified, error => error ? reject(error) : resolve(true));
        });
    }
}