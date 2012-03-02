/**
 * @copyright 2011 emagine pos
 * @exports posConnection
 * @requires wsocket
 * @requires utilities
 *
 * @todo needs to be better documented
 */
/* this line prevents WebStorm from indenting the next function call WS-100.122 */
var posconnection = function () {

	var io = new wsocket()
	var utils = new utilities()

	var exports = {}

	var heartbeatKey = "~heartbeat~"
	var heartbeatIntervalKey = "~heartbeatinterval~"
	var heartbeatReceiveValue = "~server~"
	var heartbeatSendValue = "~client~"
	var responseTimeout = 8000

// *********************************************************************************************************************
// OUTSTANDING MESSAGE *************************************************************************************************
// *********************************************************************************************************************

	/**
	 *
	 * @param {object} command
	 * @param {function} callback
	 * @param {function} timeoutCallback
	 * @constructor
	 * @private
	 */
	var outstandingMessage = function (command, callback, timeoutCallback) {
		this.requestID = command.RequestID
		this.callback = callback
		this.timeoutCallback = timeoutCallback
		this.timeoutTimer = undefined
	}

// *********************************************************************************************************************
// CONNECTION PARAMS ***************************************************************************************************
// *********************************************************************************************************************

	/**
	 * If Port is left undefined or null it will default to the port on which the page was loaded or port 80
	 *
	 * @constructor
	 */
	exports.ConnectionParams = function () {
		this.URI = undefined
		this.OnConnect = undefined
		this.OnConnecting = undefined
		this.OnConnectFailed = undefined
		this.OnDisconnect = undefined
		this.OnError = undefined
		this.OnMessage = undefined // function(socket,data)
	}
	var ConnectionParams = exports.ConnectionParams

// *********************************************************************************************************************
// CONNECTION **********************************************************************************************************
// *********************************************************************************************************************

	/**
	 * @constructor
	 */
	exports.Connection = function () {
		this.socket = undefined
		this.outstandingMessages = []
		this.reconnecting = false
		this.reconnectTimer = undefined
		this.reconnectHandleConnect = getReconnectOnConnectHandler(this)
		this.reconnectHandleConnectFailed = getReconnectOnConnectFailedHandler(this)
		this.forcingDisconnect = false
		this.lastConnect = 0
		this.tryReconnectWaitTimer = undefined
		this.disconnectTimer = undefined
		this.disconnectWaitTime = 10 * 60 * 1000

		this.onConnect = undefined
		this.onConnecting = undefined
		this.onConnectFailed = undefined
		//this.onReconnectFailed = undefined
		this.onDisconnect = undefined
		this.onError = undefined
		this.onMessage = undefined

		this.LogMessages = false
	}
	var Connection = exports.Connection

	Connection.prototype.callOnConnect = function () {
		if (this.onConnect) this.onConnect()
	}

	Connection.prototype.callOnConnecting = function () {
		if (this.onConnecting) this.onConnecting()
	}

	Connection.prototype.callOnConnectFailed = function () {
		if (this.onConnectFailed) this.onConnectFailed()
	}

	Connection.prototype.callOnDisconnect = function () {
		if (this.onDisconnect) this.onDisconnect()
	}

	Connection.prototype.callOnError = function (err) {
		if (this.onError) this.onError(err)
	}

	Connection.prototype.callOnMessage = function (data) {
		if (this.onMessage) this.onMessage(this, data)
	}

//	Connection.prototype.callOnReconnectFailed = function() {
//		if (this.onReconnectFailed) this.onReconnectFailed()
//	}

	Connection.prototype.Connect = function (connectionParams) {
		if (this.tryReconnectWaitTimer) {
			clearTimeout(this.tryReconnectWaitTimer)
			this.tryReconnectWaitTimer = undefined
		}
		if (this.reconnecting) {
			this.resetReconnect()
		}
		if (this.IsConnected() || this.IsConnecting()) {
			return
		}
		this.stopDisconnectTimer()
		this.forcingDisconnect = false

		this.onConnect = connectionParams.OnConnect
		this.onConnecting = connectionParams.OnConnecting
		this.onConnectFailed = connectionParams.OnConnectFailed
		this.onDisconnect = connectionParams.OnDisconnect
		this.onMessage = connectionParams.OnMessage
		this.onError = connectionParams.OnError

//		var socketOptions = { reconnect:true }
//		if (connectionParams.Port) socketOptions.port = connectionParams.Port
		this.socket = new io.Socket(connectionParams.URI, {});
		this.socket.On(io.Events.Connect, getOnConnectHandler(this));
		this.socket.On(io.Events.Connecting, getOnConnectingHandler(this));
		this.socket.On(io.Events.ConnectFailed, getOnConnectFailedHandler(this));
		this.socket.On(io.Events.Disconnect, getOnDisconnectHandler(this));
		this.socket.On(io.Events.Error, getOnErrorHandler(this));
		this.socket.On(io.Events.Message, getOnMessageHandler(this));
		//this.socket.on('reconnect', getOnReconnectHandler(this));
		//this.socket.on('reconnecting', getOnReconnectingHandler(this));
		//this.connecting = true
		this.socket.Connect();
	}

	Connection.prototype.Disconnect = function () {
		//if (!this.IsConnected()) return
		if (!this.socket) return
		this.forcingDisconnect = true
		if (this.reconnecting) this.resetReconnect()
		this.stopDisconnectTimer()
		this.socket.Disconnect()
	}

	Connection.prototype.IsConnected = function () {
		return this.socket && this.socket.IsConnected()
	}

	Connection.prototype.IsConnecting = function () {
		return this.socket && this.socket.IsConnecting()
	}

	Connection.prototype.removeOutstandingMessage = function (responseID) {
		for (var i in this.outstandingMessages) {
			var oc = this.outstandingMessages[i]
			if (responseID != oc.requestID) continue
			this.outstandingMessages.splice(i, 1)
			return oc
		}
		return null
	}

	Connection.prototype.resetReconnect = function () {
		this.reconnecting = false
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = undefined
		}
		this.socket.RemoveEvent(io.Events.Connect, this.reconnectHandleConnect)
		this.socket.RemoveEvent(io.Events.ConnectFailed, this.reconnectHandleConnectFailed)
	}

	/**
	 * This function starts/restarts the disconnect timer which will fire if we haven't heard from the server in a
	 * specified amount of time. Typically this will be 1.5 the heartbeat interval or 10 minutes if we don't get a
	 * heartbeat interval from the server.
	 */
	Connection.prototype.restartDisconnectTimer = function () {
		this.stopDisconnectTimer()
		this.disconnectTimer = setTimeout(getDisconnectTimerHandler(this), this.disconnectWaitTime)
	}

	Connection.prototype.stopDisconnectTimer = function () {
		if (this.disconnectTimer) {
			clearTimeout(this.disconnectTimer)
			this.disconnectTimer = undefined
		}
	}

	Connection.prototype.tryReconnect = function () {
		if (this.reconnecting) return
		this.reconnecting = true
		this.socket.On(io.Events.Connect, this.reconnectHandleConnect);
		this.socket.On(io.Events.ConnectFailed, this.reconnectHandleConnectFailed);
		this.socket.Connect()
	}

	// TODO: DTM delete at some point, this is for debugging websocket calls - I know he's not alphabetical, he's close to where's he's called since he gets changed a lot.
	function getMessageActionString(msg) {
		var result = ""
		if (msg.Action)result = msg.Action
		// add a little more information to the top level on Subscribe/Unsubscribe notifications
		if (result == "SubscribeToNotifications" || result == "UnsubscribeFromNotifications") {
			for (var i = 0; i < msg.Notifications.length; i++) {
				result += ", " + msg.Notifications[i].Action.replace("Notification", "")
			}
		}
		return result
	}

	/**
	 *
	 * @param {object} msg
	 * @param {function} callback
	 * @param {function} timeoutCallback only applicable if callback is defined
	 */
	Connection.prototype.SendMessage = function (msg, callback, timeoutCallback) {
		if (this.LogMessages) console.log("ws send: '" + getMessageActionString(msg) + "'", msg)
		if (messageNeedsRequestID(msg)) msg.RequestID = getRequestID()
		if (callback) this.addOutstandingMessage(msg, callback, timeoutCallback)
		this.socket.Send(msg)
	}

	Connection.prototype.addOutstandingMessage = function (msg, callback, timeoutCallback) {
		var om = new outstandingMessage(msg, callback, timeoutCallback)
		this.outstandingMessages.push(om)
		om.timeoutTimer = setTimeout(getResponseTimeoutHandler(this, om), responseTimeout)
	}

	function getDisconnectTimerHandler(_this) {
		return function () {
			console.log("disconnect timer event")
			_this.socket.Disconnect()
		}
	}

	function getOnConnectHandler(_this) {
		return function () {
			console.log("connect event")
			_this.lastConnect = Date.now()
			_this.callOnConnect()
			_this.restartDisconnectTimer()
		}
	}

	function getOnConnectingHandler(_this) {
		return function () {
			_this.callOnConnecting()
		}
	}

	function getOnConnectFailedHandler(_this) {
		return function () {
			console.log("connect failed event")
			_this.callOnConnectFailed()
			_this.tryReconnect()
//			if (_this.reconnecting) {
//				_this.callOnReconnectFailed()
//			} else {
//				_this.callOnConnectFailed()
//			}
		}
	}

	function getOnDisconnectHandler(_this) {
		return function () {
			console.log("disconnect event")
			_this.callOnDisconnect()
			if (_this.forcingDisconnect) {
				_this.forcingDisconnect = false
				return
			}
//				// if we connected within the last 2 seconds, then we're going to wait before we try to reconnect
//				if (Date.now() - _this.lastConnect > 2000) {
//					_this.tryReconnect()
//					return
//				}
			_this.tryReconnectWaitTimer = setTimeout(function () {
				console.log("reconnect wait timer event")
				_this.tryReconnectWaitTimer = undefined
				_this.tryReconnect()
			}, 5000) // we first try to reconnect in 5 seconds, after that we wait 15 seconds (see getReconnectOnConnectFailedHandler)
		}
	}

	function getOnErrorHandler(_this) {
		return function (err) {
			_this.callOnError(err)
		}
	}

	function getOnMessageHandler(_this) {
		return function (dataObj) {
			_this.restartDisconnectTimer()
			// received a heartbeat
			if (dataObj[heartbeatKey] && dataObj[heartbeatKey] == heartbeatReceiveValue) {
				var o = {}
				o[heartbeatKey] = heartbeatSendValue
				_this.socket.Send(o)
				return
			}
			// received a heartbeat interval
			if (dataObj[heartbeatIntervalKey]) {
				_this.disconnectWaitTime = (dataObj[heartbeatIntervalKey] * 1.5) * 1000 // multiply by 1.5 and then convert to milliseconds
				_this.restartDisconnectTimer()
				return
			}
			// we have a message we need to send up to the client
			if (!dataObj.ResponseID) {
				_this.callOnMessage(dataObj)
				return
			}
			var om = _this.removeOutstandingMessage(dataObj.ResponseID)
			if (!om) {
				// If the message has a responseID, but we didn't find it in the list, it either timed out, or we didn't
				//   specify a callback. In either case we throw it away.
//				_this.callOnMessage(dataObj)
				return
			}
			clearTimeout(om.timeoutTimer)
			om.callback(dataObj)
		}
	}

	function getReconnectOnConnectHandler(_this) {
		return function () {
			console.log("reconnect connect event")
			_this.resetReconnect()
		}
	}

	/**
	 *
	 * @param _this
	 * @param {outstandingMessage} origMessage
	 */
	function getResponseTimeoutHandler(_this, origMessage) {
		return function () {
			var om = _this.removeOutstandingMessage(origMessage.requestID)
			if (om && om.timeoutCallback) om.timeoutCallback()
		}
	}

	function getReconnectOnConnectFailedHandler(_this) {
		return function () {
			console.log("reconnect connect failed event")
			_this.reconnectTimer = setTimeout(function () {
				console.log("reconnect timer event")
				_this.reconnectTimer = undefined
				_this.socket.Connect()
			}, 15000)
		}
	}

//  function getOnReconnectHandler(_this) {
//    return function(transport_type,reconnectionAttempts) {
//      _this.connecting = false
//      _this.connected = true
//      _this.callOnConnect()
//    }
//  }
//
//  function getOnReconnectingHandler(_this) {
//    return function(reconnectionDelay,reconnectionAttempts) {
//      _this.connecting = true
//      _this.connected = false
//    }
//  }

	function getRequestID() {
		return utils.GenerateUUID()
		// TODO: think about tacking the time on the end to make sure we don't get duplicates
	}

	/**
	 * Returns true if the msg object:
	 *		 - does not contain a ResponseID field
	 *		 - does not contain a non-empty RequestID field
	 *
	 * @param {object} msg
	 * @return {boolean}
	 */
	function messageNeedsRequestID(msg) {
		if (msg.hasOwnProperty("ResponseID")) return false
		if (msg.hasOwnProperty("RequestID") && msg["RequestID"] != "") return false
		return true
	}

//  window.PosConnection = {}
//  window.PosConnection.Connection = Connection
//  window.PosConnection.ConnectionParams = ConnectionParams

	return exports
}


