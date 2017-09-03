// Misc code that only applies to Electron.
// For now this is just restoring browser shortcuts.

const _electron = require('electron')

Shortcuts.f12 = function (event) {
	_electron.remote.getCurrentWindow().toggleDevTools()
}

Shortcuts.f5 = function (event) {
	location.reload()
}
Shortcuts[['ctrl', 'r']] = Shortcuts.f5
