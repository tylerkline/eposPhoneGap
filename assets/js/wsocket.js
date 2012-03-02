/**
 * Parts of this library are taken from or modeled after:
 *
 * socket.io-node-client
 * Copyright(c) 2011 LearnBoost <dev@learnboost.com>
 * MIT Licensed
 * version: 0.6.3
 * version: 0.8.4
 *
 * @copyright 2011 emagine pos
 * @exports wsocket
 */
/* this line prevents WebStorm from indenting the next function call WS-100.122 */
var wsocket = function(){

    var exports = {}

    exports.Events = {
        Connect:"connect",
        ConnectFailed:"connect_failed",
        Connecting:"connecting",
        Disconnect:"disconnect",
        Error:"error",
        Message:"message"
    }
    var Events = exports.Events

// **********************************************************************************************************************
// SOCKET **************************************************************************************************************
// **********************************************************************************************************************

    /**
     *
     * @param {string} uriStr
     * @param {object} options
     * @constructor
     */
    exports.Socket = function (uriStr, options) {
        this.events = {}
        this.websocket = undefined
        this.connecting = false
        this.connected = false

        this.uri = parseUri(uriStr)
        if (typeof document != 'undefined') {
            this.uri.protocol = this.uri.protocol || document.location.protocol.slice(0, -1);
            this.uri.host = this.uri.host || document.domain;
            this.uri.port = this.uri.port || document.location.port;
        }
        this.options = {
            host:this.uri.host,
            secure:'https' == this.uri.protocol,
            port:this.uri.port || ('https' == this.uri.protocol ? 443 : 80),
            resource:this.uri.path || "/wsocket"
        }
    }
    var Socket = exports.Socket

    Socket.prototype.Connect = function () {
        if (this.connected) return
        //if (this.connecting) this.disconnect(true)
        this.connecting = true
        this.emit(Events.Connecting)
        var websocket = window.WebSocket
        if (!websocket) websocket = window.MozWebSocket
        if (!websocket) {
            this.emit(Events.Error, ["browser does not support websockets"])
            return
        }
        this.websocket = new websocket(this.prepareUrl())
        this.websocket.onopen = handleWebSocketOpen(this);
        this.websocket.onmessage = handleWebSocketMessage(this);
        this.websocket.onclose = handleWebSocketClose(this);
        this.websocket.onerror = handleWebSocketError(this);
    }

    Socket.prototype.Disconnect = function () {
        if (!this.connected) return
        this.websocket.close()
    }

    /**
     * @return {boolean}
     */
    Socket.prototype.IsConnected = function () {
        return this.connected
    }

    /**
     * @return {boolean}
     */
    Socket.prototype.IsConnecting = function () {
        return this.connecting
    }

    /**
     * Adds a new event listener for the given event.
     *
     * Example:
     *
     *    var socket = new Socket();
     *    socket.on("connect", function(){
     *     console.log("Connection established"");
     *    });
     *
     * @param {string} name The name of the event.
     * @param {function} fn The function to be called when the event is fired.
     */
    Socket.prototype.On = function (name, fn) {
        if (!(name in this.events)) this.events[name] = [];
        this.events[name].push(fn);
        return this;
    }

    /**
     * Fire an event to all listeners.
     *
     * @param {string} name The name of the event.
     * @param {array} args Arguments for the event.
     */
    Socket.prototype.emit = function (name, args) {
        if (!(name in this.events)) return
        // make a copy of the events so that if any handlers remove events they still get called this once
        var events = this.events[name].concat()
        for (var i = 0, len = events.length; i < len; i++) {
            events[i].apply(this, args === undefined ? [] : args)
        }
    }

    /**
     * @return {string}
     */
    Socket.prototype.prepareUrl = function () {
        return (this.options.secure ? 'wss' : 'ws')
            + '://' + this.options.host
            + ':' + this.options.port
            + '' + this.options.resource
//			+ '/' + this.type
//			+ (this.sessionid ? ('/' + this.sessionid) : '');
    }

    /**
     * Removes an event listener from the listener array for the specified event.
     *
     * @param {string} name The name of the event.
     * @param {function} fn The function that is called once the event is fired.
     */
    Socket.prototype.RemoveEvent = function (name, fn) {
        if (!(name in this.events)) return
        for (var a = 0, len = this.events[name].length; a < len; a++) {
            if (this.events[name][a] == fn || this.events[name][a].ref && this.events[name][a].ref == fn) this.events[name].splice(a, 1)
        }
    }

    /**
     * Marshalls the provided object and sends it.
     * @param {object} obj
     */
    Socket.prototype.Send = function (obj) {
        // TODO: think about queueing up the data if we're not connected
        try {
            var data = JSON.stringify(obj)
        } catch (e) {
            this.emit(Events.Error, ["Invalid JSON to send: " + e.message])
            return
        }
        this.websocket.send(data)
    }

// **********************************************************************************************************************
// INTERNAL ROUTINES ***************************************************************************************************
// **********************************************************************************************************************

    /**
     * @param {Socket} _this
     * @return {function}
     */
    function handleWebSocketClose(_this) {
        return function () {
            if (_this.connecting) {
                _this.connecting = false
                _this.emit(Events.ConnectFailed)
                return
            }
            _this.connected = false
            _this.emit(Events.Disconnect)
        }
    }

    /**
     * @param {Socket} _this
     * @return {function}
     */
    function handleWebSocketError(_this) {
        return function (err) {
			alert(err)
            _this.emit(Events.Error, [err])
        }
    }

    /**
     * @param {Socket} _this
     * @return {function}
     */
    function handleWebSocketMessage(_this) {
        return function (evt) {
            try {
                var obj = JSON.parse(evt.data)
            } catch (e) {
                _this.emit(Events.Error, ["Invalid JSON received: " + e.message])
                return
            }
            _this.emit(Events.Message, [obj])
        }
    }

    /**
     * @param {Socket} _this
     * @return {function}
     */
    function handleWebSocketOpen(_this) {
        return function () {
            _this.connecting = false
            _this.connected = true
            _this.emit(Events.Connect)
        }
    }

    /**
     * parseUri 1.2.2
     * http://blog.stevenlevithan.com/archives/parseuri
     * (c) Steven Levithan <stevenlevithan.com>
     * MIT License
     *
     * http :// user : pass @ host.com : 81 /directory/subdirectory/ file.ext ? query=1 # anchor
     * -1--         -1--     -3--     -4------     -5 -6---------------------- -7------     -8-----     -9----
     *                                                                            -10------------------------------
     *                                                                            -11-------------------------------------------------
     * 1    = protocol
     * 2    = user
     * 3    = password
     * 4    = host
     * 5    = port
     * 6    = directory
     * 7    = file
     * 8    = query
     * 9    = anchor
     * 10 = path
     * 11 = relative
     *
     * @param {string} str the uri to be parsed
     * @return {object}
     */
    function parseUri(str) {
        var o = parseUri.options, m = o.parser[o.strictMode ? "strict" : "loose"].exec(str)
        var uri = {}
        var i = 14

        while (i--) uri[o.key[i]] = m[i] || ""

        uri[o.q.name] = {}
        uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
            if ($1) uri[o.q.name][$1] = $2
        })

        return uri;
    }

    parseUri.options = {
        strictMode:false,
        key:["source", "protocol", "authority", "userInfo", "user", "password", "host", "port", "relative", "path", "directory", "file", "query", "anchor"],
        q:{
            name:"queryKey",
            parser:/(?:^|&)([^&=]*)=?([^&]*)/g
        },
        parser:{
            strict:/^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
            loose:/^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
        }
    }

    return exports

}
