var documentReady = false
var deviceReady = false

// handle ready events for document and device  (phonegap)
$(document).ready(handleDocumentReady)
document.addEventListener("deviceready", handleDeviceReady, false);

function handleDeviceReady() {
	deviceReady = true
	// hardware version
	$("#my_device").html("Device: " + device.name + "<br/>Firmware Version: " + device.version)

}
function handleDocumentReady() {
	documentReady = true
	// login button tap
	$("#login_button").tap(handleLogin)

}

function handleLogin() {
	// build json payload
	var temp = {
		Action:"Login",
		Email:$("#login_email").value(),
		Password:$("#login_password").value()
	}

	$.ajax({
		type:'POST', // defaults to 'GET'
		url:'http://192.168.1.31:5150/request', // defaults to window.location
		data:temp, // can be a string, object or result of serializeArray()
		dataType:'json', // what response type you accept from the server ('json', 'xml', 'html', or 'text')
		async:true, // set async flag (true by default)
		success:function (body) {
			alert(body)
		}, // body is a string (or if dataType is 'json', a parsed JSON object)
		error:function (xhr, type) {
			alert('error')
		} // type is a string ('error' for HTTP errors, 'parsererror' for invalid JSON)
	})
}



