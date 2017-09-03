var Shortcuts = {
	[['ctrl', 'o']]: function (event) {
		openMap(event)
		event.preventDefault()
		return false
	},
	[['ctrl', 's']]: function (event) {
		saveMap(event)
		event.preventDefault()
		return false
	},
	[['ctrl', 'z']]: function (event) {
		undo(event)
	},
	[['ctrl', 'y']]: function (event) {
		redo(event)
	},
	[['ctrl', 'shift', 'z']]: function (event) {
		redo(event)
	},
}

function getShortcut (event) {
	var keys = []
	if (event.ctrlKey) keys.push('ctrl')
	if (event.shiftKey) keys.push('shift')
	var key = event.key.toLowerCase()
	if (keys.length) {
		keys.push(key)
		return Shortcuts[keys]
	}
	return Shortcuts[key]
}

window.addEventListener('keydown', function (event) {
	var f = getShortcut(event)
	if (f) {
		return f(event)
	}
})
