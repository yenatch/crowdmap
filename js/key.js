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

var Keys = {
	enter: 13,
	esc: 27,
	left: 37,
	up: 38,
	right: 39,
	down: 40,
	delete: 46,
}

function getKeyChar (event) {
	var c = event.which || event.charCode || event.keyCode
	if (!event.ctrlKey && c > 0 && c <= 26) {
		c += 'a'.charCodeAt() - 1
	}
	if (c >= 'A'.charCodeAt() && c <= 'Z'.charCodeAt()) {
		c += 'a'.charCodeAt() - 'A'.charCodeAt()
	}
	c = String.fromCharCode(c)
	return c
}

function getShortcut (event) {
	var keys = []
	if (event.ctrlKey) keys.push('ctrl')
	if (event.shiftKey) keys.push('shift')
	var c = getKeyChar(event)
	if (c) keys.push(c)
	return Shortcuts[keys]
}

window.addEventListener('keydown', function (event) {
	var f = getShortcut(event)
	if (typeof f === 'function') {
		return f(event)
	}
})
