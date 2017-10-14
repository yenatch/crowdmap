// Misc code that only applies to Electron.
// For now this is just restoring browser shortcuts.

if (__electron__) {


const _electron = require('electron')

function openDevTools(event) {
	_electron.remote.getCurrentWindow().toggleDevTools()
}

Shortcuts.f12 = function (event) {
	openDevTools(event)
}

Shortcuts.f5 = function (event) {
	location.reload()
}
Shortcuts[['ctrl', 'r']] = Shortcuts.f5


}


if (!__electron__) {


	function openDevTools(event) {
		return false
	}


}
