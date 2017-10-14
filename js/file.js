if (__electron__) {


const fs = require('electron').remote.require('fs')
const _path = require('electron').remote.require('path')
const _dialog = require('electron').remote.dialog

var File = {

	/*
	read: function (path, options) {
		path = Path.resolve(path)
		try {
			options = options || {}
			if (options.binary) {
				return [...fs.readFileSync(path, {encoding: 'binary'})];
			}
			return fs.readFileSync(path, {encoding: 'utf8'})
		} catch (e) {
			return undefined
		}
	},
	*/

	/*
	write: function (path, data, options) {
		path = Path.resolve(path)
		options = options || {}
		var opts = {}
		if (options.binary) {
			data = new Uint8Array(data)
		}
		return fs.writeFileSync(path, data, opts)
	},
	*/

	readAsync: function (path, options) {
		path = Path.resolve(path)
		options = options || {}
		return new Promise(function (resolve, reject) {
			if (options.binary) {
				fs.readFile(path, function (error, data) {
					if (error) {
						reject(error)
					} else {
						resolve([...data])
					}
				})
			} else {
				fs.readFile(path, {encoding: 'utf8'}, function (error, data) {
					if (error) {
						reject(error)
					} else {
						resolve(data)
					}
				})
			}
		})
	},
	writeAsync: function (path, data, options) {
		path = Path.resolve(path)
		options = options || {}
		var opts = {}
		if (options.binary) {
			data = new Uint8Array(data)
		}
		return new Promise(function (resolve, reject) {
			fs.writeFile(path, data, opts, function (error, buffer) {
				if (error) {
					reject(error)
				} else {
					resolve()
				}
			})
		})
	},

	pathDialog: function () {
		return _dialog.showOpenDialog({
			properties: ['openDirectory']
		})
	},
}

var Path = {
	resolve: function (...relative) {
		return _path.resolve(...relative)
	},
	join: function (...args) {
		return _path.posix.join(...args)
	},
}


}

if (!__electron__) {

	var Server = {
		send_command: function (object) {
			var data = new FormData()
			data.append('json', JSON.stringify(object))
			return request('', {
				method: 'POST',
				data: data,
			})
			.then(function (response) {
				json = JSON.parse(response)
				return json.data
			})
		}
	}

	var File = {
		readAsync: function (path, options) {
			return Server.send_command({
				command: 'read',
				path: path,
				options: options,
			})
		},

		writeAsync: function (path, data, options) {
			return Server.send_command({
				command: 'write',
				path: path,
				data: data,
				options: options,
			})
		},

		pathDialog: function () {
			return false
		},
	}

	var Path = {
		resolve: function (...relative) {
			return Path.join(...relative)
		},
		join: function (...args) {
			return args.join('/').replace(/\/+/g, '/')
		},
	}


}
