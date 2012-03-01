var documentReady = false
var deviceReady = false
var sessionToken = undefined

// handle ready events for document and device  (phonegap)
$(document).ready(handleDocumentReady)
document.addEventListener("deviceready", handleDeviceReady, false);

function handleDeviceReady() {
	deviceReady = true
	// hardware version
	$("#my_device").html("Device: " + device.name + "<br/>Firmware Version: " + device.version)
	$("#login_email").val("tyler@emaginepos.com")
	$("#login_email").val("abc")
}

function handleDocumentReady() {
	documentReady = true
	// login button tap
	$("#login_button").bind("click", handleLogin)
}

function handleLogin() {
	var email = $("#login_email").val()
	var password = $("#login_email").val()

	// build json payload
	var temp = {
		Action:"Login",
		Email:email,
		Password:password
	}

	console.log("doing login: ")
	console.log(temp)

	$.ajax({
		type:'POST', // defaults to 'GET'
		url:'http://192.168.1.31:5150/request', // defaults to window.location
		data:JSON.stringify(temp), // can be a string, object or result of serializeArray()
		contentType:"application/json",
		dataType:'json', // what response type you accept from the server ('json', 'xml', 'html', or 'text')
		async:true, // set async flag (true by default)
		success:function (body) {
			if (body.Ok) {
				sessionToken = body.SessionToken
				processLogin(body.Account)
			}
			else {
				showError("There was an error processing your login")
			}
		}, // body is a string (or if dataType is 'json', a parsed JSON object)
		error:function (xhr, type) {
			console.log(xhr)
		} // type is a string ('error' for HTTP errors, 'parsererror' for invalid JSON)
	})
}

function processLogin(account) {
	$("#error_message").html("")
	$("#account_info").html("")
	$("<div></div>").html(account.Name).appendTo($("#account_info"))
	$("<img/>").attr("src", "http://www.gravatar.com/avatar/" + account.EmailHash + "?d=mm&s=110&r=g").appendTo($("#account_info"))
}
function showError(message) {
	$("#error_message").html(message)
}


