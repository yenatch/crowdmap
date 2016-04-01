var Shortcuts = {
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

function getKeyChar (event) {
	var c = event.charCode || event.keyCode
	console.log(c)
	if (c > 0 && c <= 26) {
		c += 'a'.charCodeAt() - 1
	} else if (c >= 'A'.charCodeAt() && c <= 'Z'.charCodeAt()) {
		c += 'a'.charCodeAt() - 'A'.charCodeAt()
	}
	c = String.fromCharCode(c)
	return c
}

function getShortcut (event) {
	var keys = []
	if (event.ctrlKey) keys.push('ctrl')
	if (event.shiftKey) keys.push('shift')
	keys.push(getKeyChar(event))
	return Shortcuts[keys]
}

window.addEventListener('keydown', function (event) {
	var f = getShortcut(event)
	if (typeof f === 'function') {
		return f(event)
	}
})
