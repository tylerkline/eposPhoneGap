$(document).ready(function(){
	// login button tap
	$("#login_button").tap(handleLogin )
})
document.addEventListener("deviceready", hookPhoneGapStuff, false);

function hookPhoneGapStuff() {
	// hardware version
	$("#my_device").html("Device: " + device.name + "<br/>Firmware Version: " + device.version)

}
function handleLogin() {
	var xhr = new XMLHttpRequest();
	xhr.open('GET', 'http://tyler.emaginepos.com:5150/test.json');
	xhr.onload = function (e) {
		alert(this.response)
		var data = JSON.parse(this.response);
	}
	xhr.send();

}



