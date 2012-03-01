// 
//  --- our app behavior logic ---
//
run(function () {
	// immediately invoked on first run
	var init = (function () {
		setMenuScreen()
		/*
		 navigator.network.isReachable("google.com", function(status) {
		 var connectivity = (status.internetConnectionStatus || status.code || status);
		 if (connectivity === NetworkStatus.NOT_REACHABLE) {
		 //alert("No internet connection - we won't be able to show you any maps");
		 } else {
		 //alert("We can reach Google - get ready for some awesome maps!");
		 }
		 });*/
	})();

	function setMenuScreen() {
		x$("#my_device").html("Device: " + device.name + "<br/>Firmware Version: " + device.version)
	}

	// a little inline controller
	when('#welcome', function () {
		setMenuScreen()
	});
	when('#login_button', function () {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', 'http://tyler.emaginepos.com:5150/test.json');
		xhr.onload = function (e) {
			alert(this.response)
			var data = JSON.parse(this.response);
		}
		xhr.send();
	});
	when('#save', function () {
		store.save({
			key:'config',
			map:ui('map'),
			zoom:ui('zoom')
		});
		display('#welcome');
	});
});
