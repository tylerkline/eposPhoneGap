/**
 * @copyright 2011 emagine pos
 * @exports utilities
 *
 */
var utilities = function(){

	var exports = {}

	// *******************************************************************************************************************
	// EVENTER ***********************************************************************************************************
	// *******************************************************************************************************************

	var Eventer = exports.Eventer = function() {
		this.bindings = {} // map[object]map[eventName][]func
	}

	Eventer.prototype.Bind = function(object, eventName, func) {
		var ob = this.bindings[object]
		if (!ob) throw new Error("Bind: Event '" + eventName + "' not registered.")
		if (!func) return
		var oe = ob[eventName]
		for (var i = 0; i < oe.length; i++) {
			if (exports.FunctionsAreSame(oe[i], func)) throw new Error("Bind: Let's not be a pig and bind the same function more than once to the '" + eventName + "' event.")
		}
		ob[eventName].push(func)
	}

	Eventer.prototype.Register = function(object, eventName) {
		var ob = this.bindings[object]
		if (!ob) ob = this.bindings[object] = {}
		var oe = ob[eventName]
		if (oe) throw new Error("Register: Event '" + eventName + "' already registered.")
		ob[eventName] = []
	}

	Eventer.prototype.Trigger = function(object, eventName, params) {
		var ob = this.bindings[object]
		if (!ob) throw new Error("Trigger: Event '" + eventName + "' not registered for object.")
		var oe = ob[eventName]
		if (!oe) throw new Error("Trigger: Event '" + eventName + "' not registered.")
		for (var i = 0; i < oe.length; i++) {
			exports.CallFunction(oe[i], params)
		}
	}

	/**
	 * The func parameter is optional and if not provided all callbacks for the given event will be unbound.
	 * If you attempt to unbind a func that is not bound, NO ERROR will be thrown. We allow this although on some days
	 * it feels kind of sloppy.
	 */
	Eventer.prototype.Unbind = function(object, eventName, func) {
		var ob = this.bindings[object]
		if (!ob) throw new Error("Unbind: Event '" + eventName + "' not registered for object.")
		var oe = ob[eventName]
		if (!oe) throw new Error("Unbind: Event '" + eventName + "' not registered.")
		// if a specific function was not passed, dump all handlers
		if (!func) {
			oe = []
			return
		}
		// dump just the specific one that was passed
		for (var i = 0; i < oe.length; i++) {
			if (exports.FunctionsAreSame(oe[i], func)) {
				oe.splice(i, 1)
				return
			}
		}
		//throw new Error("you can't unbind what you haven't bound.")
	}

	// *******************************************************************************************************************
	// POINT *************************************************************************************************************
	// *******************************************************************************************************************

	var Point=exports.Point=function(){
		this.X=0
		this.Y=0
	}

	/**
	 *
	 * @param {Point} delta
	 */
	Point.prototype.Move=function(delta){
		this.X+=delta.X
		this.Y+=delta.Y
	}

	exports.NewPoint=function(x,y){
		var result=new Point()
		result.X=x
		result.Y=y
		return result
	}

	// *******************************************************************************************************************
	// RECT **************************************************************************************************************
	// *******************************************************************************************************************

	var Rect=exports.Rect=function(){
		this.Left=0
		this.Top=0
		this.Right=0
		this.Bottom=0
	}

	Rect.prototype.GetHeight=function(){
		return this.Bottom-this.Top+1
	}

	Rect.prototype.GetWidth=function(){
		return this.Right-this.Left+1
	}

	exports.NewRect=function(){
		return new Rect()
	}

	// *******************************************************************************************************************
	// EXPORTED ROUTINES *************************************************************************************************
	// *******************************************************************************************************************

	/**
	 * If the func is undefined/null this function will return, otherwise it will call the func with the parameters
	 * and the provided scope.
	 *
	 * @param {function} func
	 * @param {array} params
	 * @param {object} scope
	 */
	exports.CallFunction = function(func, params, scope) {
		if (func) func.apply(scope, params)
	}

	/**
	 * Case-insensitively compares a and b. Returns -1 if a<b, 1 if a>b, 0 if a==b.
	 *
	 * @param {string} a
	 * @param {string} b
	 * @return {number}
	 */
	exports.CompareStringsForSort=function(a,b){
		a=a.toLowerCase()
		b=b.toLowerCase()
		if (a<b) return -1
		if (a>b) return 1
		return 0
	}

	/**
	 * Returns the concatination of src onto dst separated by sep. The separator will be intelligently omitted if src
	 * or dst are the empty string.
	 *
	 * @param {string} dst
	 * @param {string} src
	 * @param {string} sep
	 * @return {string}
	 */
	exports.ConcatWithSeparator = function(dst, sep, src) {
		if (!dst) return src
		if (!src) return dst
		return dst + sep + src
	}

	// Changes XML to JSON
	exports.ConvertXmlToJson = function(xml) {
		// Create the return object
		var obj = {};

		if (xml.nodeType == 1) { // element
			// do attributes
			if (xml.attributes.length > 0) {
				obj["@attributes"] = {};
				for (var j = 0; j < xml.attributes.length; j++) {
					var attribute = xml.attributes.item(j);
					obj["@attributes"][attribute.nodeName] = attribute.nodeValue;
				}
			}
		} else if (xml.nodeType == 3) { // text
			obj = xml.nodeValue;
		}

		// do children
		if (xml.hasChildNodes()) {
			for (var i = 0; i < xml.childNodes.length; i++) {
				var item = xml.childNodes.item(i);
				var nodeName = item.nodeName;
				if (typeof(obj[nodeName]) == "undefined") {
					obj[nodeName] = exports.ConvertXmlToJson(item);
				} else {
					if (typeof(obj[nodeName].length) == "undefined") {
						var old = obj[nodeName];
						obj[nodeName] = [];
						obj[nodeName].push(old);
					}
					obj[nodeName].push(exports.ConvertXmlToJson(item));
				}
			}
		}
		return obj;
	};

	/**
	 * Creates the markup for a gravatar image
	 * @param account
	 * @param size
	 */
	exports.CreateGravatarMarkup = function(account, size) {
		if (account == undefined) return ""
		return exports.FormatString("http://www.gravatar.com/avatar/{0}?d=mm&s={1}&r=g", account.EmailHash, size)
	}
	/**
	 * Modified version of:
	 * Date Format 1.2.3
	 * http://blog.stevenlevithan.com/archives/date-time-format
	 * (c) 2007-2009 Steven Levithan (stevenlevithan.com)
	 * MIT license
	 * Includes enhancements by Scott Trenda (scott.trenda.net)
	 * and Kris Kowal (cixar.com/~kris.kowal/)
	 *
	 * Returns a formatted version of the given date.
	 * If no format is provided a default one is used.
	 *
	 * d										Day of the month as digits; no leading zero for single-digit days.
	 * dd										Day of the month as digits; leading zero for single-digit days.
	 * ddd								Day of the week as a three-letter abbreviation.
	 * dddd								Day of the week as its full name.
	 * m										Month as digits; no leading zero for single-digit months.
	 * mm										Month as digits; leading zero for single-digit months.
	 * mmm								Month as a three-letter abbreviation.
	 * mmmm								Month as its full name.
	 * yy										Year as last two digits; leading zero for years less than 10.
	 * yyyy								Year represented by four digits.
	 * h										Hours; no leading zero for single-digit hours (12-hour clock).
	 * hh										Hours; leading zero for single-digit hours (12-hour clock).
	 * H										Hours; no leading zero for single-digit hours (24-hour clock).
	 * HH										Hours; leading zero for single-digit hours (24-hour clock).
	 * M										Minutes; no leading zero for single-digit minutes.
	 * MM										Minutes; leading zero for single-digit minutes.
	 * s										Seconds; no leading zero for single-digit seconds.
	 * ss										Seconds; leading zero for single-digit seconds.
	 * l or L						Milliseconds. l gives 3 digits. L gives 2 digits.
	 * t										Lowercase, single-character time marker string: a or p.
	 * tt										Lowercase, two-character time marker string: am or pm.
	 * T										Uppercase, single-character time marker string: A or P.
	 * TT										Uppercase, two-character time marker string: AM or PM.
	 * Z										US timezone abbreviation, e.g. EST or MDT. With non-US timezones or in the Opera browser, the GMT/UTC offset is returned, e.g. GMT-0500
	 * o										GMT/UTC timezone offset, e.g. -0500 or +0230.
	 * S										The date's ordinal suffix (st, nd, rd, or th). Works well with d.
	 * '…' or "…"		Literal character sequence. Surrounding quotes are removed.
	 * UTC:								Must be the first four characters of the mask. Converts the date from local time to UTC/GMT/Zulu time before applying the mask. The "UTC:" prefix is removed.
	 *
	 * @param {Date} dateTime
	 * @param {string} format
	 * @return {string}
	 */
	exports.FormatDateTime = function(dateTime, format) {
		var token = /d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g
		var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g
		var timezoneClip = /[^-+\dA-Z]/g
		var dayNames = [
			"Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat",
			"Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
		var monthNames = [
			"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
			"January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]

		var mask = (format && format != "") ? format : "ddd mmm dd yyyy HH:MM:ss"
		var utc = mask.slice(0, 4) == "UTC:"
		if (utc) mask = mask.slice(4);

		var prefix = utc ? "getUTC" : "get"
		var d = dateTime[prefix + "Date"]()
		var D = dateTime[prefix + "Day"]()
		var m = dateTime[prefix + "Month"]()
		var y = dateTime[prefix + "FullYear"]()
		var H = dateTime[prefix + "Hours"]()
		var M = dateTime[prefix + "Minutes"]()
		var s = dateTime[prefix + "Seconds"]()
		var L = dateTime[prefix + "Milliseconds"]()
		var o = utc ? 0 : dateTime.getTimezoneOffset()
		var flags = {
			d:d,
			dd:PadLeft(d, "0", 2),
			ddd:dayNames[D],
			dddd:dayNames[D + 7],
			m:m + 1,
			mm:PadLeft(m + 1, "0", 2),
			mmm:monthNames[m],
			mmmm:monthNames[m + 12],
			yy:String(y).slice(2),
			yyyy:y,
			h:H % 12 || 12,
			hh:PadLeft(H % 12 || 12, "0", 2),
			H:H,
			HH:PadLeft(H, "0", 2),
			M:M,
			MM:PadLeft(M, "0", 2),
			s:s,
			ss:PadLeft(s, "0", 2),
			l:PadLeft(L, "0", 3),
			L:PadLeft(L > 99 ? Math.round(L / 10) : L, "0", 2),
			t:H < 12 ? "a" : "p",
			tt:H < 12 ? "am" : "pm",
			T:H < 12 ? "A" : "P",
			TT:H < 12 ? "AM" : "PM",
			Z:utc ? "UTC" : (String(dateTime).match(timezone) || [""]).pop().replace(timezoneClip, ""),
			o:(o > 0 ? "-" : "+") + PadLeft(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, "0", 4),
			S:["th", "st", "nd", "rd"][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
		}

		return mask.replace(token, function($0) {
			return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
		})
	}

	/**
	 * Replaces {number} in "input" with the corresponding argument. The argument numbers are zero based
	 *
	 * Example:
	 *		FormatString("{1} is {0} years old.",25,"Joe")
	 *		Returns: "Joe is 25 years old"
	 *
	 * @param {string} format
	 * @param {string|number} values... the values referenced in the format string. Not an array, each value should be it's own parameter
	 * @return {string}
	 */
	exports.FormatString = function() {
		// TODO: the current implementation with the RegExp is very slow. This needs to be sped up
		//   if one of our arguments has a {x}, that will get replaced, which is probably not what you want.
		for (var i = 1; i < arguments.length; i++) {
			var exp = new RegExp('\\{' + (i - 1) + '\\}', 'gm');
			arguments[0] = arguments[0].replace(exp, arguments[i]);
		}
		return arguments[0];
	}

	/**
	 * Replaces {number} in "input" with the corresponding argument. The argument numbers are zero based
	 *
	 * Example:
	 *		FormatString("{1} is {0} years old.",25,"Joe")
	 *		Returns: "Joe is 25 years old"
	 *
	 * @param {string} format
	 * @param {string|number} values... the values referenced in the format string. Not an array, each value should be it's own parameter
	 * @return {string}
	 */
	exports.FormatString = function() {
		// TODO: think about this implementation: it might not be the fastest, and
		//   if one of our arguments has a {x}, that will get replaced, which is probably not what you want.
		for (var i = 1; i < arguments.length; i++) {
			var exp = new RegExp('\\{' + (i - 1) + '\\}', 'gm');
			arguments[0] = arguments[0].replace(exp, arguments[i]);
		}
		return arguments[0];
	}

	exports.FunctionsAreSame = function(a, b) {
		return a == b || a.ref && a.ref == b
	}

	/**
	 * Generates a version 4 UUID
	 * modified from http://stackoverflow.com/questions/105034/how-to-create-a-guid-uuid-in-javascript broofa's answer
	 */
	exports.GenerateUUID = function() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			// TODO: the 15 below was originally a 16, but that seems like we might get to many digits if we actually get 16 back
			var r = Math.random() * 15 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

	/**
	 * Adds the fields in parent to the child. The fields are not deep copied from the parent, so the parent should be
	 * a new copy of the object. The parent should not be used after this function call since the fields will be
	 * referenced by both the child and the parent.
	 *
	 * @param {object} child
	 * @param {object} parent
	 */
	exports.InheritFields = function(child, parent) {
		for (var name in parent) {
			if (parent.hasOwnProperty(name)) child[name] = parent[name]
		}
	}

	/**
	 * Adds the prototype functions in the parent to the child prototype. If the child prototype already has a property
	 * in the parent, it will NOT be overwritten.
	 *
	 * @param {object} child
	 * @param {object} parent
	 */
	exports.InheritFunctions = function(child, parent) {
		for (var i in parent.prototype) {
			// TODO: not sure if we need to hasOwnProperty here
			if (!parent.prototype.hasOwnProperty(i)) continue
			if (child.prototype[i]) continue
			child.prototype[i] = parent.prototype[i];
		}
	}

	exports.ItemInArrayHasFieldWithValue = function(items, field, value) {
		if (!items) return false
		for (var i = 0; i < items.length; i++) {
			if (items[i][field] == value) return true
		}
		return false
	}
	/**
	 * Wrapper object for the native browser localStorage.
	 */
	exports.LocalStorage = {}
	var LocalStorage = exports.LocalStorage

	/**
	 * One-to-One mapping with the native implementation. Note that this routine will only store basic data types.
	 *
	 * @param {string} key
	 * @param {boolean|number|string} value
	 */
	LocalStorage.Set = function(key, value) {
		localStorage.setItem(key, value)
	}

	/**
	 * One-to-One mapping with native implementation. Note that the return value is always a string.
	 *
	 * @param {string} key
	 * @return {string}
	 */
	LocalStorage.Get = function(key) {
		return localStorage.getItem(key)
	}

	exports.IsEmptyArray = function(object) {
		return (object == undefined || object.length == 0)
	}
	exports.IsEmptyObject = function(object) {
		// return (object == undefined || $.isEmptyObject(object))
		for (var i in object) {
			return false
		}
		return true
	}

	/**
	 *
	 * @param {string | number} val
	 * @param {string} pad the character to use for padding
	 * @param {number} len the final length of the result string
	 * @return {string}
	 */
	exports.PadLeft = function(val, pad, len) {
		var result = String(val)
		while (result.length < len) result = pad + result
		return result
	}
	var PadLeft = exports.PadLeft

	exports.PointInRect=function(point,rect){
		if (point.X<rect.Left) return false
		if (point.Y<rect.Top) return false
		if (point.X>rect.Right) return false
		if (point.Y>rect.Bottom) return false
		return true
	}

	/**
	 * Returns a string with the value repeated a specific number of times.
	 *
	 * @param {string} value the string which will be repeated
	 * @param {number} times the number of times to repeat the value
	 * @return {string}
	 */
	exports.RepeatString = function(value, times) {
		return new Array(times + 1).join(value)
	}

	// *******************************************************************************************************************
	// INTERNAL ROUTINES *************************************************************************************************
	// *******************************************************************************************************************

	return exports
}

