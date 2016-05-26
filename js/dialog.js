function warpEventDialog (warp, events) {
	eventDialog(warp, [
		['x', 'y', 'map_warp'],
		['map'],
	])
	if (warp.dialog) {
		warp.dialog.x.input.style.width = '20px'
		warp.dialog.y.input.style.width = '20px'
		warp.dialog.map_warp.input.style.width = '28px'
		warp.dialog.map_warp.title.innerHTML = 'warp'

		var warp_no = events.warps.indexOf(warp) + 1
		warp.dialog.dialog_title.innerHTML = 'warp ' + warp_no || '?'
	}
}

function npcEventDialog (npc) {
	eventDialog(npc, [
		['x', 'y', 'sprite'],
		['movement', 'radius_x', 'radius_y'],
		['clock_hour', 'clock_daytime', 'color'],
		['function', 'sight_range'],
		['script'],
		['event_flag'],
	])
	if (npc.dialog) {
		npc.dialog.x.input.style.width = '20px'
		npc.dialog.y.input.style.width = '20px'
		npc.dialog.sprite.input.style.width = '244px'
		npc.dialog.movement.input.style.width = '200px'
		npc.dialog.radius_x.input.style.width = '20px'
		npc.dialog.radius_y.input.style.width = '20px'
		npc.dialog.clock_hour.input.style.width = '20px'
		npc.dialog.clock_hour.title.innerHTML = 'hour'
		npc.dialog.clock_daytime.input.style.width = '40px'
		npc.dialog.clock_daytime.title.innerHTML = 'period'
		npc.dialog.color.input.style.width = '218px'
		npc.dialog.function.input.style.width = '228px'
		npc.dialog.sight_range.input.style.width = '20px'
		npc.dialog.script.input.style.width = '300px'
		npc.dialog.event_flag.input.style.width = '300px'
	}
}

function signEventDialog (sign) {
	eventDialog(sign, [
		['x', 'y'],
		['function'],
		['script'],
	])
	if (sign.dialog) {
		sign.dialog.x.input.style.width = '20px'
		sign.dialog.y.input.style.width = '20px'
	}
}

function trapEventDialog (trap) {
	eventDialog(trap, [
		['x', 'y'],
		['trigger'],
		['script'],
	])
	if (trap.dialog) {
		trap.dialog.x.input.style.width = '20px'
		trap.dialog.y.input.style.width = '20px'
	}
}

function titledElement (object, name) {
	var container = createElement('div', { className: 'event_dialog_cell' })
	var title = createElement('div', { className: 'event_dialog_title' })
	title.innerHTML = name.replace('_', ' ')
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

function eventDialog (npc, rows) {

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

	var title = createElement('div', { className: 'event_dialog_title' })
	content.appendChild(title)
	dialog.dialog_title = title

	function addRow() {
		var row = createElement('div', { className: 'event_dialog_row' })
		var inner = createElement('div', { className: 'event_dialog_cell' })
		var args = arguments
		for (var i = 0; i < args.length; i++) {
			(function () {
			var arg = args[i]
			var prop = titledElement(npc, arg)
			inner.appendChild(prop.container)
			updaters.push(function () { prop.input.value = npc[arg] })
			dialog[arg] = prop
			})()
		}
		row.appendChild(inner)
		content.appendChild(row)
	}

	rows.forEach(function (row) {
		addRow.apply(this, row)
	})

	npc.container.appendChild(dialog)

	dialog.focus()
}
