if (__electron__) {


const ipc = require('electron').ipcRenderer

var Task = {
	new: function (tag, ...args) {
		return new Promise(function (resolve, reject) {
			ipc.on(tag + '.success', function (event, ...results) {
				resolve(event, ...results)
			})
			ipc.on(tag + '.failed', function (event, ...results) {
				reject(event, ...results)
			})
			ipc.send(tag, ...args)
		})
	},
}


}
