//const app = require('electron').remote.app

var Settings = {

	value: function (key) {
		var config = this.get_json()
		if (arguments.length >= 1) {
			return config[key]
		}
		return config
	},

	put: function (key, value) {
		var config = this.get_json()
		if (arguments.length < 2) {
			value = key
			key = undefined
			config = value
		} else {
			config[key] = value
		}
		this.put_json(config)
	},

	//get path() {
	//	return app.getPath('userData') + '/settings.json'
	//},

	get_json: function() {
		var config = {}
		Object.update(config, Config.default)
		Object.update(config, JSON.parse(localStorage.config || '{}'))
		return config
	},

	put_json: function(json) {
		localStorage.config = JSON.stringify(json)
	},

}
