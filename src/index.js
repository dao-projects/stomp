const __slice = [].slice,
    __hasProp = {}.hasOwnProperty,
    Byte = {
        LF: "\x0A",
        NULL: "\x00"
    };
const Stomp = {
    VERSIONS: {
        V1_0: "1.0",
        V1_1: "1.1",
        V1_2: "1.2",
        supportedVersions: function() {
            return "1.1,1.0";
        }
    },
    client: function(url, protocols) {
        var klass, ws;
        if (protocols == null) {
            protocols = ["v10.stomp", "v11.stomp"];
        }
        klass = Stomp.WebSocketClass || WebSocket;
        ws = new klass(url, protocols);
        return new Client(ws);
    },
    over: function(ws) {
        return new Client(ws);
    },
    Frame: Frame,
    setInterval: (interval, f) => {
        return setInterval(f, interval);
    },
    clearInterval: (id) => {
        return clearInterval(id);
    }
};
class Frame {
    constructor(command, headers, body) {
        this.command = command;
        this.headers = headers != null ? headers : {};
        this.body = body != null ? body : "";
    }
    static sizeOfUTF8(s) {
        if (s) {
            return encodeURI(s).match(/%..|./g).length;
        } else {
            return 0;
        }
    }
    static unmarshall(datas) {
        let frame, frames, last_frame, r;
        frames = datas.split(RegExp("" + Byte.NULL + Byte.LF + "*"));
        r = {
            frames: [],
            partial: ""
        };
        r.frames = (function() {
            var _i, _len, _ref, _results;
            _ref = frames.slice(0, -1);
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                frame = _ref[_i];
                _results.push(Frame.unmarshallSingle(frame));
            }
            return _results;
        })();
        last_frame = frames.slice(-1)[0];
        if (last_frame === Byte.LF || last_frame.search(RegExp("" + Byte.NULL + Byte.LF + "*$")) !== -1) {
            r.frames.push(Frame.unmarshallSingle(last_frame));
        } else {
            r.partial = last_frame;
        }
        return r;
    }
    static marshall(command, headers, body) {
        let frame,
            Byte = {
                LF: "\x0A",
                NULL: "\x00"
            };
        frame = new Frame(command, headers, body);
        return frame.toString() + Byte.NULL;
    }
    toString() {
        let lines, name, skipContentLength, value, _ref;
        lines = [this.command];
        skipContentLength = this.headers["content-length"] === false ? true : false;
        if (skipContentLength) {
            delete this.headers["content-length"];
        }
        _ref = this.headers;
        for (name in _ref) {
            if (!__hasProp.call(_ref, name)) continue;
            value = _ref[name];
            lines.push("" + name + ":" + value);
        }
        if (this.body && !skipContentLength) {
            lines.push("content-length:" + Frame.sizeOfUTF8(this.body));
        }
        lines.push(Byte.LF + this.body);
        return lines.join(Byte.LF);
    }
    static unmarshallSingle(data) {
        var body, chr, command, divider, headerLines, headers, i, idx, len, line, start, trim, _i, _j, _len, _ref, _ref1;
        divider = data.search(RegExp("" + Byte.LF + Byte.LF));
        headerLines = data.substring(0, divider).split(Byte.LF);
        command = headerLines.shift();
        headers = {};
        trim = function(str) {
            return str.replace(/^\s+|\s+$/g, "");
        };
        _ref = headerLines.reverse();
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
            line = _ref[_i];
            idx = line.indexOf(":");
            headers[trim(line.substring(0, idx))] = trim(line.substring(idx + 1));
        }
        body = "";
        start = divider + 2;
        if (headers["content-length"]) {
            len = parseInt(headers["content-length"]);
            body = ("" + data).substring(start, start + len);
        } else {
            chr = null;
            for (i = _j = start, _ref1 = data.length; start <= _ref1 ? _j < _ref1 : _j > _ref1; i = start <= _ref1 ? ++_j : --_j) {
                chr = data.charAt(i);
                if (chr === Byte.NULL) {
                    break;
                }
                body += chr;
            }
        }
        return new Frame(command, headers, body);
    }
}
class Client {
    constructor(ws) {
        this.ws = ws;
        this.ws.binaryType = "arraybuffer";
        this.counter = 0;
        this.connected = false;
        this.heartbeat = {
            outgoing: 10000,
            incoming: 10000
        };
        this.maxWebSocketFrameSize = 16 * 1024;
        this.subscriptions = {};
        this.partialData = "";
    }
    static now() {
        if (Date.now) {
            return Date.now();
        } else {
            return new Date().valueOf;
        }
    }
    debug(message) {
        var _ref;
        return typeof window !== "undefined" && window !== null ? ((_ref = window.console) != null ? _ref.log(message) : void 0) : void 0;
    }
    _transmit(command, headers, body) {
        let out;
        out = Frame.marshall(command, headers, body);
        if (typeof this.debug === "function") {
            this.debug(">>> " + out);
        }
        while (true) {
            if (out.length > this.maxWebSocketFrameSize) {
                this.ws.send(out.substring(0, this.maxWebSocketFrameSize));
                out = out.substring(this.maxWebSocketFrameSize);
                if (typeof this.debug === "function") {
                    this.debug("remaining = " + out.length);
                }
            } else {
                return this.ws.send(out);
            }
        }
    }
    _setupHeartbeat(headers) {
        let serverIncoming, serverOutgoing, ttl, v, _ref, _ref1;
        if ((_ref = headers.version) !== Stomp.VERSIONS.V1_1 && _ref !== Stomp.VERSIONS.V1_2) {
            return;
        }
        (_ref1 = (function() {
            let _i, _len, _ref1, _results;
            _ref1 = headers["heart-beat"].split(",");
            _results = [];
            for (_i = 0, _len = _ref1.length; _i < _len; _i++) {
                v = _ref1[_i];
                _results.push(parseInt(v));
            }
            return _results;
        })()), (serverOutgoing = _ref1[0]), (serverIncoming = _ref1[1]);
        if (!(this.heartbeat.outgoing === 0 || serverIncoming === 0)) {
            ttl = Math.max(this.heartbeat.outgoing, serverIncoming);
            if (typeof this.debug === "function") {
                this.debug("send PING every " + ttl + "ms");
            }
            this.pinger = Stomp.setInterval(ttl, (function(_this) {
                return function() {
                    _this.ws.send(Byte.LF);
                    return typeof _this.debug === "function" ? _this.debug(">>> PING") : void 0;
                };
            })(this));
        }
        if (!(this.heartbeat.incoming === 0 || serverOutgoing === 0)) {
            ttl = Math.max(this.heartbeat.incoming, serverOutgoing);
            if (typeof this.debug === "function") {
                this.debug("check PONG every " + ttl + "ms");
            }
            return (this.ponger = Stomp.setInterval(ttl, (function(_this) {
                return function() {
                    let delta;
                    delta = Client.now() - _this.serverActivity;
                    if (delta > ttl * 2) {
                        if (typeof _this.debug === "function") {
                            _this.debug("did not receive server activity for the last " + delta + "ms");
                        }
                        return _this.ws.close();
                    }
                };
            })(this)));
        }
    }
    _parseConnect() {
        var args, connectCallback, errorCallback, headers;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        headers = {};
        switch (args.length) {
            case 2:
                (headers = args[0]), (connectCallback = args[1]);
                break;
            case 3:
                if (args[1] instanceof Function) {
                    (headers = args[0]), (connectCallback = args[1]), (errorCallback = args[2]);
                } else {
                    (headers.login = args[0]), (headers.passcode = args[1]), (connectCallback = args[2]);
                }
                break;
            case 4:
                (headers.login = args[0]), (headers.passcode = args[1]), (connectCallback = args[2]), (errorCallback = args[3]);
                break;
            default:
                (headers.login = args[0]), (headers.passcode = args[1]), (connectCallback = args[2]), (errorCallback = args[3]), (headers.host = args[4]);
        }
        return [headers, connectCallback, errorCallback];
    }
    connect() {
        var args, errorCallback, headers, out;
        args = 1 <= arguments.length ? __slice.call(arguments, 0) : [];
        out = this._parseConnect.apply(this, args);
        (headers = out[0]), (this.connectCallback = out[1]), (errorCallback = out[2]);
        if (typeof this.debug === "function") {
            this.debug("Opening Web Socket...");
        }
        this.ws.onmessage = (function(_this) {
            return function(evt) {
                var arr, c, client, data, frame, messageID, onreceive, subscription, unmarshalledData, _i, _len, _ref, _results;
                data = typeof ArrayBuffer !== "undefined" && evt.data instanceof ArrayBuffer ? ((arr = new Uint8Array(evt.data)), typeof _this.debug === "function" ? _this.debug("--- got data length: " + arr.length) : void 0, (function() {
                    var _i, _len, _results;
                    _results = [];
                    for (_i = 0, _len = arr.length; _i < _len; _i++) {
                        c = arr[_i];
                        _results.push(String.fromCharCode(c));
                    }
                    return _results;
                })().join("")) : evt.data;
                _this.serverActivity = Client.now();
                if (data === Byte.LF) {
                    if (typeof _this.debug === "function") {
                        _this.debug("<<< PONG");
                    }
                    return;
                }
                if (typeof _this.debug === "function") {
                    _this.debug("<<< " + data);
                }
                unmarshalledData = Frame.unmarshall(_this.partialData + data);
                _this.partialData = unmarshalledData.partial;
                _ref = unmarshalledData.frames;
                _results = [];
                for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                    frame = _ref[_i];
                    switch (frame.command) {
                        case "CONNECTED":
                            if (typeof _this.debug === "function") {
                                _this.debug("connected to server " + frame.headers.server);
                            }
                            _this.connected = true;
                            _this._setupHeartbeat(frame.headers);
                            _results.push(typeof _this.connectCallback === "function" ? _this.connectCallback(frame) : void 0);
                            break;
                        case "MESSAGE":
                            subscription = frame.headers.subscription;
                            onreceive = _this.subscriptions[subscription] || _this.onreceive;
                            if (onreceive) {
                                client = _this;
                                messageID = frame.headers["message-id"];
                                frame.ack = function(headers) {
                                    if (headers == null) {
                                        headers = {};
                                    }
                                    return client.ack(messageID, subscription, headers);
                                };
                                frame.nack = function(headers) {
                                    if (headers == null) {
                                        headers = {};
                                    }
                                    return client.nack(messageID, subscription, headers);
                                };
                                _results.push(onreceive(frame));
                            } else {
                                _results.push(typeof _this.debug === "function" ? _this.debug("Unhandled received MESSAGE: " + frame) : void 0);
                            }
                            break;
                        case "RECEIPT":
                            _results.push(typeof _this.onreceipt === "function" ? _this.onreceipt(frame) : void 0);
                            break;
                        case "ERROR":
                            _results.push(typeof errorCallback === "function" ? errorCallback(frame) : void 0);
                            break;
                        default:
                            _results.push(typeof _this.debug === "function" ? _this.debug("Unhandled frame: " + frame) : void 0);
                    }
                }
                return _results;
            };
        })(this);
        this.ws.onclose = (function(_this) {
            return function() {
                var msg;
                msg = "Whoops! Lost connection to " + _this.ws.url;
                if (typeof _this.debug === "function") {
                    _this.debug(msg);
                }
                _this._cleanUp();
                return typeof errorCallback === "function" ? errorCallback(msg) : void 0;
            };
        })(this);
        return (this.ws.onopen = (function(_this) {
            return function() {
                if (typeof _this.debug === "function") {
                    _this.debug("Web Socket Opened...");
                }
                headers["accept-version"] = Stomp.VERSIONS.supportedVersions();
                headers["heart-beat"] = [_this.heartbeat.outgoing, _this.heartbeat.incoming].join(",");
                return _this._transmit("CONNECT", headers);
            };
        })(this));
    }
    disconnect(disconnectCallback, headers) {
        if (headers == null) {
            headers = {};
        }
        this._transmit("DISCONNECT", headers);
        this.ws.onclose = null;
        this.ws.close();
        this._cleanUp();
        return typeof disconnectCallback === "function" ? disconnectCallback() : void 0;
    }
    _cleanUp() {
        this.connected = false;
        if (this.pinger) {
            clearInterval(this.pinger);
        }
        if (this.ponger) {
            return clearInterval(this.ponger);
        }
    }
    send(destination, headers, body) {
        if (headers == null) {
            headers = {};
        }
        if (body == null) {
            body = "";
        }
        headers.destination = destination;
        return this._transmit("SEND", headers, body);
    }
    subscribe(destination, callback, headers) {
        var client;
        if (headers == null) {
            headers = {};
        }
        if (!headers.id) {
            headers.id = "sub-" + this.counter++;
        }
        headers.destination = destination;
        this.subscriptions[headers.id] = callback;
        this._transmit("SUBSCRIBE", headers);
        client = this;
        return {
            id: headers.id,
            unsubscribe: function() {
                return client.unsubscribe(headers.id);
            }
        };
    }
    unsubscribe(id) {
        delete this.subscriptions[id];
        return this._transmit("UNSUBSCRIBE", {
            id: id
        });
    }
    begin(transaction) {
        var client, txid;
        txid = transaction || "tx-" + this.counter++;
        this._transmit("BEGIN", {
            transaction: txid
        });
        client = this;
        return {
            id: txid,
            commit: function() {
                return client.commit(txid);
            },
            abort: function() {
                return client.abort(txid);
            }
        };
    }
    commit(transaction) {
        return this._transmit("COMMIT", {
            transaction: transaction
        });
    }
    abort(transaction) {
        return this._transmit("ABORT", {
            transaction: transaction
        });
    }
    ack(messageID, subscription, headers) {
        if (headers == null) {
            headers = {};
        }
        headers["message-id"] = messageID;
        headers.subscription = subscription;
        return this._transmit("ACK", headers);
    }
    nack(messageID, subscription, headers) {
        if (headers == null) {
            headers = {};
        }
        headers["message-id"] = messageID;
        headers.subscription = subscription;
        return this._transmit("NACK", headers);
    }
}
export default Stomp;