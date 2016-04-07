function titledElement (object, name) {
	var container = createElement('div', { className: 'event_dialog_cell' })
	var title = createElement('div', { className: 'event_dialog_title' })
	title.innerHTML = name
	var input = createElement('input', { name: name, value: object[name], className: 'event_dialog_value' })
	input.oninput = function (event) {
		object[name] = input.value
	}
	input.onchange = function (event) {
		object[name] = input.value
	}
	container.appendChild(title)
	container.appendChild(input)
	return {
		container: container,
		title: title,
		input: input,
	}
}

function warpEventDialog (warp) {
	if (warp.dialog) {
		removeElement(warp.dialog)
		warp.dialog = undefined
		return
	}

	var dialog = createElement('div', { className: 'event_dialog' })
	warp.dialog = dialog
	warp.dialog.update = function () {
		x.input.value = warp.x
		y.input.value = warp.y
		map_warp.input.value = warp.map_warp
		map.input.value = warp.map
	}

	warp.container.appendChild(dialog)

	var content = createElement('div', { className: 'warp_dialog_content' })
	dialog.appendChild(content)

	var x = titledElement(warp, 'x')
	var y = titledElement(warp, 'y')
	var map_warp = titledElement(warp, 'map_warp')
	map_warp.title.innerHTML = 'warp'
	var map = titledElement(warp, 'map')

	var new_container = createElement('div', { className: 'event_dialog_cell' })
	x.input.style.width = '20px'
	y.input.style.width = '20px'
	map_warp.input.style.width = '28px'
	new_container.appendChild(x.container)
	new_container.appendChild(y.container)
	new_container.appendChild(map_warp.container)

	var map_container = createElement('div', { className: 'event_dialog_row' })
	map_container.style.display = 'table-row'
	map_container.appendChild(map.container)

	content.appendChild(new_container)
	content.appendChild(map_container)

	dialog.focus()
}
