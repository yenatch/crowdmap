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
		warp.container.style.zIndex = ''
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
	warp.container.style.zIndex = '98'

	var content = createElement('div', { className: 'event_dialog_content' })
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

function npcEventDialog (npc) {
	if (npc.dialog) {
		removeElement(npc.dialog)
		npc.dialog = undefined
		npc.container.style.zIndex = ''
		return
	}

	var dialog = createElement('div', { className: 'event_dialog' })
	npc.dialog = dialog

	var updaters = []
	npc.dialog.update = function () {
		updaters.forEach(function (updater) { updater() })
	}

	npc.container.appendChild(dialog)
	npc.container.style.zIndex = '98'

	var content = createElement('div', { className: 'event_dialog_content' })
	dialog.appendChild(content)

	function addRow() {
		var row = createElement('div', { className: 'event_dialog_row' })
		var args = arguments
		for (var i = 0; i < args.length; i++) {
			(function () {
			var arg = args[i]
			var prop = titledElement(npc, arg)
			row.appendChild(prop.container)
			updaters.push(function () { prop.input.value = npc[arg] })
			})()
		}
		content.appendChild(row)
	}

	addRow('x', 'y')
	addRow('sprite', 'movement')
	addRow('radius_y', 'radius_x')
	addRow('clock_hour', 'clock_daytime')
	addRow('color', 'function')
	addRow('sight_range', 'script')
	addRow('event_flag')

	npc.container.appendChild(dialog)
}
