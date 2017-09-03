function create_div (className) {
	return createElement('div', { className: className })
}

function notice(message) {
	error(message, 5000)
}

function error(message, expire) {
	// A user-facing error.

	var errors = document.getElementById('errors')

	var error = create_div('error')

	var error_message = create_div('error_message')
	error_message.innerHTML = message
	error.appendChild(error_message)

	var close = create_div('close_button')
	error.appendChild(close)

	errors.appendChild(error)
	close.addEventListener('click', function () {
		errors.removeChild(error)
	})

	while (errors.children.length > 10) {
		errors.removeChild(errors.children[0])
	}

	if (expire) {
		window.setTimeout(function () {
			errors.removeChild(error)
		}, expire)
	}
}

function clear_errors() {
	document.getElementById('errors').innerHTML = ''
}

function clear_nojs() {
	var nojs = document.getElementById('nojs')
	if (nojs) {
		document.body.removeChild(nojs)
	}
}
