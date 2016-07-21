window.addEventListener('popstate', function (event) {
	var map_name = document.location.hash.substr(1)
	if (map_name) {
		_gotoMap(map_name)
	}
})

function gotoMap(name) {
	document.location.hash = name
}

function scrollToMiddle(div) {
	//div.scrollIntoView({ behavior: 'smooth' })
	var rect = div.parentNode.getBoundingClientRect()
	var height = rect.bottom - rect.top
	div.parentNode.scrollTop = div.offsetTop - height * 0.5
}

function _gotoMap(name) {
	var loaded = false
	if (Data.maps[name]) {
		if (Data.maps[name].loaded) {
			view.current_map = name
			var tileset = Data.tilesets[Data.maps[name].header.tileset]
			if (tileset) {
				picker_view.map = name
				picker_view.run()
			}
			view.run()
			loaded = true
		}
	}

	var loading_div = createElement('div', { className: 'loading-splash', })
	view.container.appendChild(loading_div)
	var remove_loading_div = function () {view.container.removeChild(loading_div)}

	var promise = loadMap(name)
	promise.then(remove_loading_div, remove_loading_div)
	promise.then(function () {
		view.current_map = name
		picker_view.map = name
		view.run()
		picker_view.run()
	})
	promise.then(function () {
		return loadMapConnections(name)
	})
	.then(function () {
		view.run()
	})


	return promise
}

function loadMapAndConnections(name) {
	return loadMap(name)
	.then(function () {
		loadMapConnections(name)
	})
}

function loadMapConnections(name) {
	var map = Data.maps[name]
	var promises = []
	for (var dir in map.attributes.connections) {
		var connection = map.attributes.connections[dir]
		promises.push(loadMap(connection.name))
	}
	return Promise.all(promises)
}


function main() {
	init()
}

function init() {
	clear_nojs()
	clear_errors()

	toolbar = Object.create(Toolbar)
	toolbar.init()

	view = Object.create(MapViewer)
	view.init()

	picker_view = Object.create(BlockViewer)
	picker_view.init()

	picker = Object.create(BlockPicker)
	picker.init(picker_view)
	
	painter = Object.create(Painter)
	painter.init(view)

	view.attach(document.body)
	var map_name = document.location.hash.substr(1) || config.default_map
	_gotoMap(map_name)
	.then(function () {
		picker_view.attach(document.body)
		painter.run()
	})
}

function getTileset(map_name) {
	var map = Data.maps[map_name]
	var tileset = Data.tilesets[map.header.tileset]
	return tileset
}

function getTilesetTiles(tileset, roof) {
	if (config.roof_tilesets.contains(tileset.id)) {
		if (typeof roof !== 'undefined' && tileset.with_roofs) {
			var tilesets = tileset.with_roofs[roof]
			if (typeof tilesets !== 'undefined') {
				if (config.roofs[roof] !== -1) {
					return tilesets.tiles
				} else {
					return tilesets.tiles_just_palette
				}
			}
		}
	}
	return tileset.tiles
}

print = console.log.bind(console)

function clearDialogs () {
	var dialogs = document.getElementsByClassName('dialog')
	var remove = []
	for (var i = 0; i < dialogs.length; i++) {
		var element = dialogs[i]
		remove.push(element)
	}
	remove.forEach(function (element) {
		removeElement(element)
	})
}

function removeNewestDialog() {
	var dialogs = document.getElementsByClassName('dialog')
	if (dialogs.length) {
		removeElement(dialogs[dialogs.length - 1])
	}
}

document.addEventListener('keydown', function (event) {
	if (event.which === Keys.esc) {
		removeNewestDialog()
	}
})

function newDialog (parent, id) {
	var div = createElement('div', {id: id, className: 'dialog', tabIndex: '1',})
	parent.appendChild(div)
	return div
}

function newMap (event) {
	var new_id = 'dialog_new'
	var existing = document.getElementById(new_id)
	if (existing) {
		removeElement(existing)
		return
	}
	var open = document.getElementById('dialog_open')
	if (open) {
		removeElement(open)
	}

	var dialog = newDialog(toolbar.container, new_id)
	var content = createElement('div', {className: 'map_attributes'})

	var div = createElement('div', {className: 'map_header_item'})
	div.appendChild(createElement('div', {innerHTML: 'label', className: 'map_header_key'}))
	var label_input = createElement('input', {className: 'map_header_param'})
	div.appendChild(label_input)
	content.appendChild(div)

	var div = createElement('div', {className: 'map_header_item'})
	div.appendChild(createElement('div', {innerHTML: 'map group', className: 'map_header_key'}))
	var group_list = createElement('select', {className: 'map_header_param'})
	getMapGroupNames().then(function (names) {
		group_list.innerHTML = ''
		names.map(function (name) {
			group_list.appendChild(createElement('option', {value: name, innerHTML: name}))
		})
		group_list.appendChild(createElement('option', {value: '__new__', innerHTML: 'Add a new group'}))
	})
	div.appendChild(group_list)
	content.appendChild(div)

	var button = createElement('button', {innerHTML: 'yep do it', className: 'map_header_confirm'})
	button.onclick = function (event) {
		var label = label_input.value
		if (!label) return
		var group = group_list.value
		send_command({
			command: 'add_map',
			label: label,
			group: group,
			width: 20,
			height: 20,
			header: config.default_map_header,
			header_2: config.default_map_header_2,
		})
		.then(function () {
			console.log('added ' + label + ' in group ' + group)
			clearDialogs()
			gotoMap(label)
		})
	}

	content.appendChild(button)

	dialog.appendChild(content)
}

function editMapHeader (event) {
	var edit_id = 'dialog_edit'
	var existing = document.getElementById(edit_id)

	if (existing) {
		removeElement(existing)
		return
	}

	if (!view.current_map) return
	var map = Data.maps[view.current_map]
	if (!map) return
	if (!map.loaded) return

	var dialog = newDialog(toolbar.container, edit_id)
	var content = createElement('div', {className: 'map_attributes'})

	var header = map.header
	for (var key in header) {
		if (key === 'label') continue
		if (key === 'tileset') continue
		var value = header[key]
		var div = createElement('div', {className: 'map_header_item'})
		div.appendChild(createElement('div', {innerHTML: key, className: 'map_header_key'}))
		var input = createElement('input', {name: key, value: value, className: 'map_header_param'})
		;(function (input, key) {
		input.addEventListener('change', function (event) {
			if (input.value) {
				var value = input.value
				if (!isNaN(parseInt(value))) {
					value = parseInt(value)
				}
				if (header[key] !== value) {
					header[key] = value
					if (key === 'group') {
						loadMapTileset(view.current_map)
						.then(function () {
							view.run()
							picker_view.run()
						})
					} else {
						view.run()
						picker_view.run()
					}
				}
			}
		})})(input, key)
		div.appendChild(input)
		content.appendChild(div)
	}

	var tileset_preview_image = new Image()
	config.getTilesetImagePath(header.tileset)
	.then(function (path) {
		tileset_preview_image.src = path
	})
	tileset_preview_image.setAttribute('validate', 'always')
	var tileset_preview = createElement('div', {className: 'tileset-preview'})
	tileset_preview.appendChild(tileset_preview_image)
	content.appendChild(tileset_preview)

	var tileset_list = tilesetList()
	var selected

	tileset_list.list_promise.then(function (list) {
		list.map(function (elem, i) {
			elem.addEventListener('click', function (event) {
				header.tileset = i
				loadMapTileset(view.current_map)
				.then(function () {
					view.run()
					picker_view.run()
				})
			})
			elem.addEventListener('click', function (event) {
				config.getTilesetImagePath(i)
				.then(function (path) {
					tileset_preview_image.src = path
				})
				if (selected === i) {
					content.removeChild(tileset_list.element)
					content.appendChild(tileset_preview)
				} else {
					selected = i
					tileset_list.select(i)
				}
			})
		})
	})

	tileset_preview.addEventListener('click', function (event) {
		if (content.children['tileset_list']) {
			content.removeChild(tileset_list.element)
		} else {
			content.removeChild(tileset_preview)
			selected = header.tileset
			tileset_list.select(selected)
			content.appendChild(tileset_list.element)
		}
	})

	dialog.appendChild(content)
}

function getTilesetNames () {
	return Promise.resolve(range(36))
}

function tilesetList () {

	var div = createElement('div', {id: 'tileset_list', className: 'tileset-list'})

	var list_promise = getTilesetNames()
	.then(function (names) {
		var list = []
		names.map(function (name, i) {
			var container = createElement('div', {className: 'tileset-preview'})
			var image = new Image()
			config.getTilesetImagePath(i)
			.then(function (path) {
				image.src = path
			})
			image.setAttribute('validate', 'always')
			container.appendChild(image)
			div.appendChild(container)
			list[i] = image
		})
		return Promise.resolve(list)
	})

	var select = function (selected) {
		getTilesetNames()
		.then(function (names) {
			names.map(function (name, i) {
				var element = div.children[i]
				if (i === selected) {
					element.className = 'tileset-preview selected'
				} else {
					element.className = 'tileset-preview'
				}
			})
		})
	}

	return {
		list_promise: list_promise,
		element: div,
		select: select,
	}
}

function openMap (event) {
	var open_id = 'dialog_open'
	var existing = document.getElementById(open_id)
	if (existing) {
		removeElement(existing)
		return
	}
	var existing_new = document.getElementById('dialog_new')
	if (existing_new) {
		removeElement(existing_new)
	}

	var dialog = newDialog(toolbar.container, open_id)
	dialog.style.width = '0px'

	var options = createElement('div', { className: 'map_list_options' })
	var internal = createElement('div', { className: 'map_list_button', innerHTML: '123' })
	var alpha = createElement('div', { className: 'map_list_button', innerHTML: 'ABC' })
	options.appendChild(internal)
	options.appendChild(alpha)

	dialog.appendChild(options)

	var map_list = createElement('div', {className: 'map_list'})
	dialog.appendChild(map_list)

	var selected
	var select = function (div) {
		deselect()
		selected = div
		addClass(div, 'selected')
	}
	var deselect = function () {
		if (selected) {
			removeClass(selected, 'selected')
		}
		selected = undefined
	}

	dialog.addEventListener('keydown', function (event) {
		var key = event.which
		var indexOf = function (div) {
			for (var i = 0; i < map_list.children.length; i++) {
				if (div === map_list.children[i]) {
					return i
				}
			}
			return -1
		}
		if (key === Keys.enter) {
			selected.onclick()
		} else if (key === Keys.down) {
			var div = map_list.children[indexOf(selected) + 1]
			if (div && !div.className.contains('map_group_item')) {
				div = map_list.children[indexOf(div) + 1]
			}
			if (div) {
				select(div)
				scrollToMiddle(div)
				event.preventDefault()
			}
		} else if (key === Keys.up) {
			var div = map_list.children[indexOf(selected) - 1]
			if (div && !div.className.contains('map_group_item')) {
				div = map_list.children[indexOf(div) - 1]
			}
			if (div) {
				select(div)
				scrollToMiddle(div)
				event.preventDefault()
			}
		}
	})

	var createNames = function (names) {
		var list = []
		var last_letter
		names.forEach(function (name) {
			var letter = name[0].toUpperCase()
			if (letter !== last_letter) {
				list.push(createElement('div', {className: 'map_group_name', innerHTML: letter}))
				last_letter = letter
			}

			var container = createElement('div', {className: 'map_group_item'})

			var div = createElement('div', {className: 'map_name'})
			div.innerHTML = name
			container.appendChild(div)

			container.onclick = function (event) {
				deselect()
				select(container)
				gotoMap(name)
			}

			list.push(container)
			if (name === view.current_map) {
				select(container)
			}
		})
		return list
	}

	var createGroups = function (groups) {
		var list = []
		groups.forEach(function (group) {
			var div = createElement('div', {className: 'map_group_name'})
			div.innerHTML = group.name
			list.push(div)
			group.maps.forEach(function (name, i) {
				var container = createElement('div', {className: 'map_group_item'})

				var num_div = createElement('div', {className: 'map_group_num'})
				num_div.innerHTML = (groups.indexOf(group) + 1) + '.' + (i + 1)
				container.appendChild(num_div)

				var div = createElement('div', {className: 'map_name'})
				div.innerHTML = name
				container.appendChild(div)

				if (name === view.current_map) {
					select(container)
				}

				container.onclick = function (event) {
					deselect()
					select(container)
					gotoMap(name)
				}

				list.push(container)
			})
		})
		return list
	}

	var populate = function (divs) {
		map_list.innerHTML = ''
		dialog.style.width = '400px'
		divs.forEach(function (div) {
			map_list.appendChild(div)
		})
		if (selected) {
			scrollToMiddle(selected)
		}
		dialog.focus()
	}

	addClass(internal, 'active')
	getMapGroups()
	.then(createGroups)
	.then(populate)

	internal.onclick = function () {
		addClass(internal, 'active')
		removeClass(alpha, 'active')
		getMapGroups()
		.then(createGroups)
		.then(populate)
	}

	alpha.onclick = function () {
		addClass(alpha, 'active')
		removeClass(internal, 'active')
		getMapNames()
		.then(function (names) {
			names.sort()
			return names
		})
		.then(createNames)
		.then(populate)
	}

}

function send_command(content) {
	var data = new FormData()
	data.append('json', JSON.stringify(content))

	return request('', {
		method: 'POST',
		data: data,
	})
}

function save(filename, data) {
	return send_command({
		command: 'save',
		filename: filename,
		data: data,
	})
}

function saveMap (event) {
	var map_name = view.current_map
	Promise.all([
		saveBlockdata(map_name),
		saveMapEvents(map_name),
		saveMapHeader(map_name),
		saveMapHeader2(map_name),
		saveMapDimensions(map_name),
	]).then(function () {
		error('saved ' + map_name)
	})
}

function saveBlockdata(map_name) {
	var data = Data.maps[map_name].blockdata
	return config.getBlockdataPath(map_name)
	.then(function (path) {
		return Data.saveFile(path, data, { binary: true })
	})
}

function saveMapEvents(map_name) {
	var filename = config.getMapEventPath(map_name)
	return Data.loadFile(filename, { dont_prompt: true })
	.then(function (text) {
		var r = rgbasm.instance()
		var seen = false
		var dbs = 0
		var start = text.length, end = text.length
		r.macros.db = function (values) {
			if (seen) {
				dbs += values.length
			}
		}
		r.callbacks.label = function (line) {
			if (line.label.contains(map_name + '_MapEventHeader')) {
				start = text.indexOf(line.original_line)
				seen = true
			} else if (seen && dbs >= 6) {
				end = text.indexOf(line.original_line)
				return true
			}
		}
		r.read(text)

		text = text.substring(0, start) + map_name + serializeMapEvents(Data.maps[map_name].events) + (end !== -1 ? '\n' + text.substring(end) : '')
		return Data.saveFile(filename, text)
	})
}

function saveMapHeader(map_name) {
	var header = Data.maps[map_name].header
	header = config.serializeMapHeader(header)
	var filename = config.map_header_path
	return Data.loadFile(filename, { dont_prompt: true })
	.then(function (text) {
		var r = rgbasm.instance()
		var start = text.length, end = text.length
		r.macros.map_header = function (values, line) {
			if (values[0] === map_name) {
				start = text.indexOf(line.original_line)
				end = start + line.original_line.length
				return true
			}
		}
		r.read(text)
		text = text.substring(0, start) + header + text.substring(end)
		return Data.saveFile(filename, text)
	})
}

function saveMapHeader2(map_name) {
	var header = Data.maps[map_name].attributes
	header = config.serializeMapHeader2(header)
	var filename = config.map_header_2_path
	return Data.loadFile(filename, { dont_prompt: true })
	.then(function (text) {
		var r = rgbasm.instance()
		var start = text.length, end = text.length
		var seen = false
		r.macros.map_header_2 = function (values, line) {
			if (seen) {
				return true
			}
			if (values[0] === map_name) {
				start = text.indexOf(line.original_line)
				end = start + line.original_line.length
				seen = true
			}
		}
		r.macros.connection = function (values, line) {
			if (seen) {
				end = text.indexOf(line.original_line) + line.original_line.length
			}
		}
		r.read(text)
		text = text.substring(0, start) + header + text.substring(end)
		return Data.saveFile(filename, text)
	})
}

function saveMapDimensions(map_name) {
	var filename = config.map_dimensions_path
	var map = Data.maps[map_name]
	return Data.loadFile(filename, { dont_prompt: true })
	.then(function (text) {
		var r = rgbasm.instance()
		var start = text.length, end = text.length
		r.macros.mapgroup = function (values, line) {
			if (values[0] === map.attributes.map) {
				start = text.indexOf(line.original_line)
				end = start + line.original_line.length
				return true
			}
		}
		r.read(text)
		var new_line = config.serializeMapDimensions(map)
		text = text.substring(0, start) + new_line + text.substring(end)
		return Data.saveFile(filename, text)
	})
}

function reloadMap (event) {
	return loadMap(view.current_map)
	.then(function () {
		view.run()
		picker_view.run()
		//view.commit()
	})
}

function toggleBrightness (event) {

	var time = {
		day:  'nite',
		nite: 'morn',
		morn: 'day',
	}[config.time]

	setBrightness(time, event.currentTarget)
}

function setBrightness (time, element) {

	if (element) {
		element.children[0].style.color = {
			day:  '#aaa',
			nite: '#666',
			morn: '#888',
		}[time]

		element.children[0].innerHTML = {
			day:  '☀',
			nite: '🌙',
			morn: '☀',
		}[time]
	}

	config.time = time

	var map = Data.maps[view.current_map]
	getTilesetWithRoof(map.header.tileset, map.header.group)
	readTiles(map.header.tileset, map.header.group)
	var connections = map.attributes.connections
	for (var direction in connections) {
		var connection = connections[direction]
		map = Data.maps[connection.name]
		getTilesetWithRoof(map.header.tileset, map.header.group)
	}

	view.run()
	picker_view.run()
}

function undo (event) {
	History.undo()
}

function redo (event) {
	History.redo()
}


var Toolbar = {

	init: function () {
		this.container = this.createElement('div', {
			id: 'toolbar-container',
			className: 'toolbar-container',
		})
		this.element = this.createElement('div', {
			id: 'toolbar',
			className: 'toolbar',
		})
		var ext = this.createElement('div', {
			id: 'toolbar-extended',
			className: 'toolbar_extended',
		})
		this.element.appendChild(ext)

		this.buttons = {}
		for (var k in this.button_defs) {
			var def = this.button_defs[k]
			var button = this.createElement('div')
			button.id = k
			button.className = 'tool'

			def.listeners.forEach(function (listener) {
				button.addEventListener(listener[0], listener[1])
			})

			var icon = this.createElement('div')
			icon.innerHTML = def.icon
			icon.className = 'tool_icon'
			button.appendChild(icon)

			var text = this.createElement('div')
			text.innerHTML = def.text
			text.className = 'tool_desc'
			button.appendChild(text)

			this.buttons[k] = button
			this.element.appendChild(button)
		}

		// Click the bar to hide button text.
		var hider = this.createElement('div')
		hider.style.width = '100%'
		hider.style.height = '100%'
		var self = this
		var hidden = false
		hider.addEventListener('click', function (event) {
			if (hidden) {
				self.unhide_description()
			} else {
				self.hide_description()
			}
			hidden = !hidden
		})
		this.element.appendChild(hider)

		this.container.appendChild(this.element)
		document.body.appendChild(this.container)
	},

	hide_description: function () {
		this.element.style.width = '52px'
	},

	unhide_description: function () {
		this.element.style.width = ''
	},

	createElement: createElement,

	button_defs: {
		new: {
			icon: '+',
			text: 'New map',
			listeners: [
				['click', newMap],
			],
		},

		edit: {
			icon: '...',
			text: 'Map properties',
			listeners: [
				['click', editMapHeader],
			],
		},

		open: {
			icon: '☰',
			text: 'Map list',
			listeners: [
				['click',  openMap],
			],
		},

		save: {
			icon: '💾', //&#x1f4be;
			text: 'Save map',
			listeners: [
				['click',  saveMap],
			],
		},

		reload: {
			icon: '⟳',
			text: 'Reload',
			listeners: [
				['click',  reloadMap],
			],
		},

		time: {
			icon: '☀',
			text: 'Lighting',
			listeners: [
				['click',  toggleBrightness],
			],
		},

		undo: {
			icon: '↺',
			text: 'Undo',
			listeners: [
				['click',  undo],
			],
		},

		redo: {
			icon: '↻',
			text: 'Redo',
			listeners: [
				['click',  redo],
			],
		},

	},

}


/*
function loadMapProperty(map_name, property) {
	return config.read(property, name)
	.then(function (result) {
		Data.maps[name][property] = result
	})
}
*/

function loadMapEvents(name) {
	return config.readEvents(name)
	.then(function (events) {
		parseEvents(events)
		Data.maps[name].events = events
		return events
	})
}

function loadMapHeader(name) {
	return getMapHeader(name)
	.then(function (header) {
		Data.maps[name].header = header
	})
}

function createMapHeader() {
	return Object.create(config.default_map_header)
}


function loadMapAttributes(name) {
	return getMapHeader2(name)
	.then(function (attributes) {
		Data.maps[name].attributes = attributes
	})
}

function createMapHeader2() {
	return Object.create(config.default_map_header_2)
}


var Data = {
	maps: {},
	tilesets: {},
	roofs: {},
	sprites: {},
	facings: [],
	constants: {},
	files: {},
	changed_files: [],

	loadFile: function (uri, options) {
		// todo complain when the client has changed the file, not the server
		var self = this
		return request(uri, options)
		.then(function (data) {
			if (typeof self.files[uri] === 'undefined') {
				self.files[uri] = []
			}
			var last_data = self.files[uri][self.files[uri].length - 1]
			var ok = true
			if (!equals(data, last_data)) {
				if (typeof last_data !== 'undefined') {
					if (!options.dont_prompt) {
						ok = confirm(uri + " has changed! Are you sure you want to reload it?")
					}
					if (ok) {
						if (!self.changed_files.contains(uri)) {
							self.changed_files.push(uri)
						}
					} else {
						data = last_data.slice()
					}
				}
				if (ok) {
					self.files[uri].push(data.slice())
				}
			}
			return data.slice()
		})
	},
	saveFile: function (uri, data, options) {
		var self = this
		return request(uri, options)
		.then(function (other_data) {
			if (typeof self.files[uri] === 'undefined') {
				self.files[uri] = []
			}
			var last_data = self.files[uri][self.files[uri].length - 1]
			var ok = true
			if (typeof last_data !== 'undefined') {
				if (!equals(other_data, last_data)) {
					ok = confirm(uri + " was changed by another program! Are you sure you want to overwrite it?")
				}
			}
			if (ok) {
				self.files[uri].push(data.slice())
				save(uri, data.slice())
			}
		})
	},
}

var History = Object.update([], {
	get: function () {
		return this[this.head]
	},

	redo: function () {
		var min = Math.min
		this.head = min(this.head + 1, this.length - 1)
	},

	undo: function () {
		var max = Math.max
		this.head = max(this.head - 1, 0)
	},

	commit: function (changes) {
		// Cut off alternate futures.
		var min = Math.min
		this.length = min(this.length, this.head + 1)
		this.push(changes)
		this.head += 1
	},
})


var getEventCoord = function (event) {
	var rect = event.target.getBoundingClientRect()
	return {
		x: (event.clientX - rect.left),
		y: (event.clientY - rect.top),
	}
}

function getCanvasSelection (event, canvas, drawcanvas) {
	var selection = getEventCoord(event)

	// event.target is not necessarily canvas.
	var rect = {
		canvas: canvas.getBoundingClientRect(),
		target: event.target.getBoundingClientRect(),
	}
	selection.x += rect.target.left - rect.canvas.left
	selection.y += rect.target.top - rect.canvas.top

	selection.x *= drawcanvas.width / canvas.width
	selection.y *= drawcanvas.height / canvas.height
	return selection
}

var BlockPicker = {

	init: function (blockViewer) {
		this.viewer = blockViewer
		this.attachPickerMouseEvents()
	},

	getSelection: function (event) {
		this.viewer.getSelection(event)
		this.selection = this.viewer.selection
	},

	attachPickerMouseEvents: function () {
		var self = this
		this.viewer.canvas.addEventListener('mousedown', function (event) {
			event.preventDefault()
		})
		this.viewer.canvas.addEventListener('mousemove', function (event) {
			self.getSelection(event)
		})
		this.viewer.canvas.addEventListener('mouseout', function (event) {
			self.viewer.selection = undefined
		})
		this.viewer.canvas.addEventListener('click', function (event) {
			self.getSelection(event)
			var x = self.selection.x
			var y = self.selection.y
			x = (x - (x % 32)) / 32
			y = (y - (y % 32)) / 32
			var block = self.viewer.tileset.blockdata[y * self.viewer.width + x]
			if (typeof block !== 'undefined') {
				painter.pick(block)
			}
			event.preventDefault()
		})
	},

}

var BlockViewer = {

	get size () {
		return this.blockdata.length
	},
	get blockdata () {
		return this.tileset.blockdata
	},
	get height () {
		return Math.ceil(this.size / this.width)
	},
	get tileset () {
		if (Data.maps[this.map] && Data.maps[this.map].header) {
			return Data.tilesets[Data.maps[this.map].header.tileset]
		}
	},

	init: function () {
		var self = this

		this.width = 4

		this.meta_w = 4
		this.meta_h = 4
		this.tile_w = 8
		this.tile_h = 8

		this.canvas = createElement('canvas', {
			id: 'picker',
			className: 'picker',
		})

		this.drawcanvas = createElement('canvas')

		this.scale = 1

		this.container = createElement('div', {
			id: 'pickerbar',
			className: 'pickerbar',
		})
		this.container.appendChild(this.canvas)

		this.wrapper = createElement('div', {
			id: 'picker-wrapper',
			className: 'picker-wrapper',
		})
		this.wrapper.appendChild(this.container)

	},

	attach: function (container) {
		container = container || document.body
		replaceChild(container, this.wrapper)
		this.attachResize()
	},

	run: function () {
		var self = this
		function draw () {
			self.draw()
			window.requestAnimationFrame(draw)
		}
		self.redraw = true
		if (!self.running) {
			self.running = true
			window.requestAnimationFrame(draw)
		}
	},

	draw: function () {
		if (this.tileset) {

			var dimensions = {
				width:  this.width  * this.meta_w * this.tile_w,
				height: this.height * this.meta_h * this.tile_h,
			}

			Object.update(this.drawcanvas, dimensions, { careful: true })

			dimensions.width  *= this.scale
			dimensions.height *= this.scale
			Object.update(this.canvas, dimensions, { careful: true })

			if (this.redraw) {
				this.render()
				this.redraw = false
			}

			var context = this.canvas.getContext('2d')
			context.drawImage(
				this.drawcanvas,
				0, 0, this.drawcanvas.width, this.drawcanvas.height,
				0, 0, this.canvas.width, this.canvas.height
			)

			this.drawSelection()
			this.drawSelectedBlock()
		}
	},

	render: function () {
		for (var y = 0; y < this.height; y++)
		for (var x = 0; x < this.width; x++) {
			var block = this.blockdata[y * this.width + x]
			if (typeof block !== 'undefined') {
				this.drawMetatile(x, y, block)
			}
		}
		this.drawBlockNumbers()
	},

	drawBlockNumbers: function () {
		var drawcontext = this.drawcanvas.getContext('2d')
		drawcontext.save()
		drawcontext.font = '8px Segoe UI Symbol, sans-serif'
		drawcontext.fillStyle = 'white'
		drawcontext.strokeStyle = 'black'
		drawcontext.lineWidth = 3
		drawcontext.textBaseline = 'top'
		var i = 0
		for (var y = 0; y < this.height; y++)
		for (var x = 0; x < this.width; x++) {
			if (i < this.blockdata.length) {
				var text_x = x * this.meta_w * this.tile_w
				var text_y = y * this.meta_h * this.tile_h
				var text = i.toString(16).toUpperCase()
				drawcontext.strokeText(text, text_x, text_y)
				drawcontext.fillText(text, text_x, text_y)
			}
			i += 1
		}
		drawcontext.restore()
	},

	drawSelectedBlock: function () {
		if (painter) {
			var selected = painter.getPaintBlock()
			if (selected >= 0 && selected < this.blockdata.length) {
				var x = selected % this.width
				var y = (selected - x) / this.width
				var ctx = this.canvas.getContext('2d')
				ctx.save()
				ctx.strokeStyle = 'red'
				ctx.lineWidth = 2
				var rect = new Path2D()
				rect.rect(x * 32, y * 32, 32, 32)
				ctx.stroke(rect)
				ctx.restore()
			}
		}
	},

	drawMetatile: function (x, y, block) {
		drawMetatile({
			x: x,
			y: y,
			block: block,
			tileset: this.tileset,
			roof: Data.maps[this.map].header.group,
			permission: Data.maps[this.map].header.permission,
			context: this.drawcanvas.getContext('2d'),
			tile_w: this.tile_w,
			tile_h: this.tile_h,
			meta_w: this.meta_w,
			meta_h: this.meta_h,
		})
	},

	getSelection: function (event) {
		this.selection = getCanvasSelection(event, this.canvas, this.drawcanvas)
	},

	drawSelection: function () {
		if (!this.selection) return

		var context = this.canvas.getContext('2d')
		var self = this
		var fillRect = function (x, y, w, h) {
			x *= self.scale
			y *= self.scale
			w *= self.scale
			h *= self.scale
			context.fillRect(x, y, w, h)
		}

		var x = this.selection.x
		var y = this.selection.y

		var tile_w = this.tile_w
		var tile_h = this.tile_h
		var block_w = tile_w * this.meta_w
		var block_h = tile_h * this.meta_h

		var w = block_w
		var h = block_h
		x = x - x % w
		y = y - y % h

		var block = this.blockdata[y/h * this.width + x/w]
		if (typeof block === 'undefined') {
			return
		}

		context.save()
		context.globalCompositeOperation = 'lighten'
		context.fillStyle = 'rgba(255, 80, 80, 20)'
		fillRect(x, y, w, h)
		//fillRect(x - x % tile_w, y - y % tile_h, tile_w, tile_h)
		context.restore()

	},

	attachResize: function () {
		var self = this
		var round = Math.round
		var w = self.meta_w * self.tile_w * self.scale

		var elements
		var align = function () {
			var bar_height = self.height * 32 + 'px'
			if (elements.w.style.height !== bar_height) {
				elements.w.style.height = bar_height
			}
		}

		makeResizable(self.container, ['w'], {
			init: function (props) {
				elements = props.elements
				elements.w.style.max_height = '100%'
				align()
			},
			start: function (props) {
				align()
			},
			drag: function (props) {
				var event = props.event
				var x = event.clientX, y = event.clientY
				var rect = self.container.getBoundingClientRect()
				var xd = props.xd, yd = props.yd
				var x1 = 0
				if (xd < 0) x1 = round((x - rect.right) / w) + self.width + 1
				var width = self.width - x1
				if (width < 1) {
					width = 1
				}
				if (self.width !== width) {
					self.width = width
					self.redraw = true
				}
				align()
			},
			stop: function (props) {
				align()
			},
		})
	},

}

var Painter = {

	init: function (viewer) {
		this.viewer = viewer
	},

	run: function () {
		var self = this
		self.actions = {}

		this.viewer.canvas.addEventListener('mouseup', function (event) {
			event.preventDefault()
			self.onmouseup(event)
		})
		this.viewer.canvas.addEventListener('mouseout', function (event) {
			self.viewer.selection = undefined
		})
		this.viewer.canvas.addEventListener('mousemove', function (event) {
			event.preventDefault()
			self.viewer.getSelection(event)
			self.onmousemove(event)
		})
		this.viewer.canvas.addEventListener('mousedown', function (event) {
			event.preventDefault()
			self.viewer.getSelection(event)
			self.onmousedown(event)
		})
		this.viewer.canvas.addEventListener('contextmenu', function (event) {
			event.preventDefault()
		})

		this.attachResize()
	},

	onmousedown: function (event) {
		if (isRightClick(event)) {
			if (!this.inConnectionBoundary()) {
				this.actions.picking = true
			}
		} else {
			if (this.inMapBoundary()) {
				this.actions.painting = true
			}
		}
		this.update(event)
	},

	onmousemove: function (event) {
		this.update(event)
	},

	onmouseup: function (event) {
		this.actions = {}
	},

	inMapBoundary: function () {
		var position = this.getPosition()
		var x = position.x, y = position.y
		var map = this.viewer.getCurrentMap()
		if (x >= 0 && x < map.width)
		if (y >= 0 && y < map.height) {
			return true
		}
		return false
	},

	inConnectionBoundary: function () {
		var position = this.getPosition()
		var x = position.x, y = position.y
		var map = this.viewer.getCurrentMap()
		var connections = map.attributes.connections
		for (var direction in connections) {
			var connection = connections[direction]
			var info = getConnectionInfo(connection, map, Data.maps[connection.name])
			if (info)
			if (x+3 >= info.x1 && x+3 < info.x2)
			if (y+3 >= info.y1 && y+3 < info.y2) {
				return true
			}
		}
		return false
	},

	getPosition: function () {
		var self = this
		var x = self.viewer.selection.x
		var y = self.viewer.selection.y
		x = (x - (x % 32)) / 32
		y = (y - (y % 32)) / 32
		x -= self.viewer.origin.x
		y -= self.viewer.origin.y
		return { x: x, y: y }
	},

	attachResize: function () {
		var self = this
		var round = Math.round
		var w = self.viewer.meta_w * self.viewer.tile_w * self.viewer.scale
		var h = self.viewer.meta_h * self.viewer.tile_h * self.viewer.scale
		var x1, y1, x2, y2
		var map
		makeResizable(self.viewer.container, undefined /* all directions */, {
			start: function (props) {
				map = Data.maps[self.viewer.current_map]
				x1 = 0
				y1 = 0
				x2 = map.width
				y2 = map.height
			},
			drag: function (props) {
				var event = props.event
				var x = event.clientX, y = event.clientY

				var rect = self.viewer.container.getBoundingClientRect()
				var xd = props.xd, yd = props.yd
				if (xd < 0) x1 += round(round(x - rect.left)   / w)
				if (xd > 0) x2 += round(round(x - rect.right)  / w)
				if (yd < 0) y1 += round(round(y - rect.top)    / h)
				if (yd > 0) y2 += round(round(y - rect.bottom) / h)

				if (xd < 0) { if (x1 >= x2) x1 = x2 - 1 }
				else        { if (x2 <= x1) x2 = x1 + 1 }
				if (yd < 0) { if (y1 >= y2) y1 = y2 - 1 }
				else        { if (y2 <= y1) y2 = y1 + 1 }

				self.viewer.canvas.style.marginTop = -(y1) * h + 'px'
				self.viewer.canvas.style.marginLeft = -(x1) * w + 'px'
				self.viewer.canvas.style.marginBottom = (y2 - map.height) * h + 'px'
				self.viewer.canvas.style.marginRight = (x2 - map.width) * w + 'px'
			},
			stop: function (props) {
				crop(x1, y1, x2, y2)
				self.viewer.canvas.style.margin = ''
				self.viewer.redraw = true
			},
		})
	},

	update: function (event) {
		var position = this.getPosition()
		var x = position.x, y = position.y
		if (this.actions.picking) {
			this.pick(getBlock(this.viewer.current_map, x, y))
		}
		if (this.actions.painting) {
			this.paint(x, y)
		}
	},

	paint_block: 1,

	pick: function (block) {
		this.paint_block = block
	},

	getPaintBlock: function () {
		var block = this.paint_block
		if (typeof block === 'undefined') block = this.viewer.getCurrentMap().attributes.border_block
		return block
	},

	paint: function (x, y, block) {
		if (typeof block === 'undefined') block = this.getPaintBlock()
		setBlock(this.viewer.current_map, x, y, block)
	},

}

var makeResizable = (function () {

	var styles = {
		n:  { top:    -1, left:   0, right:  0,  height: 1, },
		s:  { bottom: -1, left:   0, right:  0,  height: 1, },
		e:  { right:  -1, top:    0, bottom: 0,  width:  1, },
		w:  { left:   -1, top:    0, bottom: 0,  width:  1, },
		ne: { top:    -1, right: -1, width:  1,  height: 1, },
		nw: { top:    -1, left:  -1, width:  1,  height: 1, },
		se: { bottom: -1, right: -1, width:  1,  height: 1, },
		sw: { bottom: -1, left:  -1, width:  1,  height: 1, },
	}
	var all_directions = ['n','s','e','w','ne','nw','se','sw']

	all_directions.forEach(function (direction) {
		var style = styles[direction]
		for (var attribute in style) {
			style[attribute] *= 5
			style[attribute] += 'px'
		}
	})

	return function (element, directions, callbacks) {
		directions = directions || all_directions
		var elements = {}
		directions.forEach(function (direction) {
			var elem = createElement('div', {
				className: 'resize-bar',
			})
			var style = styles[direction]
			Object.update(elem.style, style)
			elem.style.cursor = direction + '-resize'
			elem.addEventListener('mousedown', start)
			element.appendChild(elem)
			elements[direction] = elem

			var x, y, w, h, xd, yd
			function start (event) {
				event.preventDefault()
				var style = window.getComputedStyle(element)
				x = event.clientX
				y = event.clientY
				w = parseInt(style.width)
				h = parseInt(style.height)
				document.addEventListener('mousemove', drag, false)
				document.addEventListener('mouseup', stop, false)
				if (callbacks && callbacks.start) {
					callbacks.start({ event: event, x:x, y:y, w:w, h:h, element:elem })
				}
			}
			function drag (event) {
				yd = direction.contains('n') ? -1 : direction.contains('s') ? 1 : 0
				xd = direction.contains('w') ? -1 : direction.contains('e') ? 1 : 0

				if (callbacks && callbacks.drag) {
					callbacks.drag({ event: event, x:x, y:y, w:w, h:h, xd:xd, yd:yd, element:elem })
				} else {
					if (xd) element.style.width = (w - x + event.clientX * xd) + 'px'
					if (yd) element.style.height = (h - y + event.clientY * yd) + 'px'
				}
			}
			function stop (event) {
				if (callbacks && callbacks.stop) {
					callbacks.stop({ event: event, x:x, y:y, w:w, h:h, xd:xd, yd:yd, element:elem })
				}
				document.removeEventListener('mousemove', drag, false)
				document.removeEventListener('mouseup', stop, false)
			}
		})
		if (callbacks.init) {
			callbacks.init({ elements:elements })
		}
	}
})()

function setBlock (name, x, y, block) {
	var map = Data.maps[name]
	if (x >= 0 && x < map.width)
	if (y >= 0 && y < map.height) {
		map.blockdata[x + y * map.width] = block
	}
}

function getBlock (name, x, y) {
	var map = Data.maps[name]
	if (x < 0 || y < 0 || x >= map.width || y >= map.height) {
		return undefined
	}
	return map.blockdata[x + y * map.width]
}

var MapViewer = {
	init: function () {
		this.canvas = createElement('canvas', {
			id: 'map_viewer',
			className: 'map_viewer',
		})

		this.drawcanvas = createElement('canvas')

		this.container = createElement('div', { className: 'view_container' })
		this.container.appendChild(this.canvas)

		this.wrapper = createElement('div', { className: 'view-wrapper' })
		this.wrapper.appendChild(this.container)

		this.scale = 1

		this.meta_w = 4
		this.meta_h = 4
		this.tile_w = 8
		this.tile_h = 8

		this.origin = {
			x: 3,
			y: 3,
		}

		this.addConnectionListeners()
	},

	addConnectionListeners: function () {
		var self = this
		this.canvas.addEventListener('contextmenu', function (event) {
			self.getSelection(event)
			var x = self.selection.x / 32
			var y = self.selection.y / 32

			var connections = Data.maps[self.current_map].attributes.connections
			var connect = false
			for (var direction in connections) {
				var connection = connections[direction]
				var info = getConnectionInfo(connection, Data.maps[self.current_map], Data.maps[connection.name])
				if (info)
				if (x >= info.x1 && x < info.x2)
				if (y >= info.y1 && y < info.y2) {
					connect = connection
					break
				}
			}
			if (connect) {
				print(connect.direction + ' to ' + connect.name)
				gotoMap(connect.name)
			}
			event.preventDefault()
		})

		var dragging = false
		var origin = {}
		var start = function (event) {
			if (!isRightClick(event)) {
				self.getSelection(event)
				var x = (self.selection.x - (self.selection.x % 32)) / 32
				var y = (self.selection.y - (self.selection.y % 32)) / 32
				var connections = Data.maps[self.current_map].attributes.connections
				for (var direction in connections) {
					var connection = connections[direction]
					var info = getConnectionInfo(connection, Data.maps[self.current_map], Data.maps[connection.name])
					if (info)
					if (x >= info.x1 && x < info.x2)
					if (y >= info.y1 && y < info.y2) {
						dragging = connection
						origin.x = x
						origin.y = y
						origin.align = connection.align
						break
					}
				}
			}
		}
		var drag = function (event) {
			if (dragging) {
				self.getSelection(event)
				var x = (self.selection.x - (self.selection.x % 32)) / 32
				var y = (self.selection.y - (self.selection.y % 32)) / 32
				var dx = x - origin.x
				var dy = y - origin.y
				var direction = dragging.direction
				var map = Data.maps[self.current_map]
				var min_x = 0
				var min_y = 0
				var max_x = map.width + 6
				var max_y = map.height + 6
				if (direction === 'north' || direction === 'south') {
					dragging.align = origin.align + dx
					var info = getConnectionInfo(dragging, map, Data.maps[dragging.name])
					if (info.x1 < min_x) {
						dragging.align -= info.x1 - min_x
					} else if (info.x2 >= max_x) {
						dragging.align -= info.x2 - max_x
					}
				} else if (direction === 'east' || direction === 'west') {
					dragging.align = origin.align + dy
					var info = getConnectionInfo(dragging, map, Data.maps[dragging.name])
					if (info.y1 < min_y) {
						dragging.align -= info.y1 - min_y
					} else if (info.y2 >= max_y) {
						dragging.align -= info.y2 - max_y
					}
				}
			}
		}
		var stop = function (event) {
			dragging = false
		}
		this.canvas.addEventListener('mousedown', start)
		window.addEventListener('mousemove', drag)
		window.addEventListener('mouseup', stop)
	},

	attach: function (container) {
		container = container || document.body
		replaceChild(container, this.wrapper)
	},

	run: function () {
		var self = this
		function draw () {
			self.draw()
			window.requestAnimationFrame(draw)
		}
		self.redraw = true
		if (!self.running) {
			self.running = true
			window.requestAnimationFrame(draw)
		}
	},

	draw: function () {
		if (this.current_map && Data.maps[this.current_map]) {
			if (this.redraw) {
				this.blockdata = []
				this.redraw = false
			}
			this.renderMap(this.current_map)
			this.renderEvents()
		}
	},

	renderMap: function (map) {

		var width = Data.maps[map].width
		var height = Data.maps[map].height
		var dimensions = {
			width:  (6 + width)  * this.meta_w * this.tile_w,
			height: (6 + height) * this.meta_h * this.tile_h,
		}

		Object.update(this.drawcanvas, dimensions, { careful: true })

		dimensions.width  *= this.scale
		dimensions.height *= this.scale
		Object.update(this.canvas, dimensions, { careful: true })

		this.drawMap(map)
		this.drawMapBorder(map)

		var context = this.canvas.getContext('2d')
		context.drawImage(
			this.drawcanvas,
			0, 0, this.drawcanvas.width, this.drawcanvas.height,
			0, 0, this.canvas.width, this.canvas.height
		)

		this.drawSelection()
		this.darkenMapBorder()

	},

	getCurrentMap: function () {
		return Data.maps[this.current_map]
	},

	renderEvents: function () {
		var all_events = this.getAllEvents()

		var npcs = this.getEvents().npcs
		if (npcs) npcs.forEach(function (npc) {
			var facing = config.getFacing(npc)
			if (facing && facing.tiles) {
				npc.element.style.width = facing.width + 'px'
				npc.element.style.height = facing.height + 'px'
				npc.canvas.width = facing.width
				npc.canvas.height = facing.height
				var ctx = npc.canvas.getContext('2d')
				var tiles = config.getNpcTiles(npc)
				if (tiles) {
					facing.tiles.forEach(function (props) {
						var tile = tiles[props.tile]
						if (typeof tile !== 'undefined') {
							if (typeof props.attr === 'string' && props.attr.contains('X_FLIP')) {
								ctx.save()
								ctx.scale(-1,1)
								ctx.drawImage(tile, -(props.x + 8), props.y)
								ctx.restore()
							} else {
								ctx.drawImage(tile, props.x, props.y)
							}
						}
					})
					if (npc.element.style.backgroundImage !== 'none') {
						npc.element.style.backgroundImage = 'none'
						npc.element.style.opacity = '1'
					}
				} else {
					if (npc.element.style.backgroundImage) {
						npc.element.style.backgroundImage = undefined
						npc.element.style.opacity = undefined
					}
				}
			}
		})

		var self = this
		all_events.forEach(function (npc) {
			if (npc.element) {
				var left = (parseInt(npc.x) + 6) * 16 + 'px'
				if (left !== npc.element.style.left) {
					npc.element.style.left = left
					npc.container.style.left = left
				}
				var ml = self.canvas.style.marginLeft
				if (ml !== npc.container.style.marginLeft) {
					npc.container.style.marginLeft = ml
				}
				var top = (parseInt(npc.y) + 6) * 16 + 'px'
				if (top !== npc.element.style.top) {
					npc.element.style.top = top
					npc.container.style.top = top
				}
				var mt = self.canvas.style.marginTop
				if (mt !== npc.container.style.marginTop) {
					npc.container.style.marginTop = mt
				}
			}
		})

		this.addNewEvents()
	},

	getEvents: function () {
		var events = this.getCurrentMap().events
		return events || {}
	},

	getAllEvents: function () {
		var events = this.getEvents()
		var all_events = [].concat(
			events.npcs || [],
			events.warps || [],
			events.traps || [],
			events.signs || []
		)
		return all_events
	},

	addNewEvents: function () {
		// Remove any unused events, without re-adding existing ones.

		var all_events = this.getAllEvents()

		var container = this.container
		var children = container.children

		function is_npc (child) {
			var classes = ['npc', 'warp', 'sign', 'trap']
			for (var i = 0; i < classes.length; i++) {
				if (child.className.contains(classes[i])) {
					return true
				}
			}
			return false
		}

		// Get a list of all the events.
		var remove = []
		for (var i = 0; i < children.length; i++) {
			var child = children[i]
			if (is_npc(child)) {
				remove.push(child)
			}
		}

		// Remove existing events from the list, and add events who don't exist yet.
		all_events.forEach(function (npc) {
			var index = remove.indexOf(npc.container)
			if (index !== -1) {
				remove.splice(index, 1)
			} else {
				container.appendChild(npc.container)
			}
		})

		// Removing an element doesn't fire any events, so we'll just hijack mouseout.
		var event = new MouseEvent('mouseout')
		remove.forEach(function (child) {
			container.removeChild(child)
			child.dispatchEvent(event)
		})

	},

	drawMap: function (map) {
		var height = Data.maps[map].height
		var width = Data.maps[map].width
		for (var y = 0; y < height; y++)
		for (var x = 0; x < width; x++) {
			this.drawMetatile(map, x, y)
		}
	},

	drawMapBorder: function (map) {
		// Draw both the border and surrounding connections.

		var blocks = []

		var border_block = Data.maps[map].attributes.border_block
		var width = Data.maps[map].width
		var height = Data.maps[map].height
		var real_width = width + 6
		var i = 0
		for (var y = -3; y < height + 3; y++)
		for (var x = -3; x < width + 3; x++) {
			if (y >= 0 && y < height)
			if (x >= 0 && x < width) {
				i += width
				x = width
			}
			blocks[i] = border_block
			i += 1
		}

		var maps = []
		var connections = Data.maps[map].attributes.connections
		for (var c in connections) {
			var connection = connections[c]
			var info = getConnectionInfo(connection, Data.maps[map], Data.maps[connection.name])
			if (!info) continue
			var other_map = Data.maps[connection.name]
			if (!other_map.blockdata) continue

			var width = Data.maps[map].width
			for (var y = info.strip_y; y < info.strip_y + info.strip_height; y++) {
				for (var x = info.strip_x; x < info.strip_x + info.strip_width; x++) {
					var block = other_map.blockdata[
						info.other_start
						+ (x - info.strip_x)
						+ (y - info.strip_y) * other_map.width
					]
					var i = (width + 6) * (y + 3) + (x + 3)
					maps[i] = connection.name
					blocks[i] = block
				}
			}
		}

		var i = 0
		for (var y = -3; y < height + 3; y++)
		for (var x = -3; x < width + 3; x++) {
			this.drawMetatile(maps[i] || map, x, y, blocks[i])
			i += 1
		}
	},

	darkenMapBorder: function () {

		var map = this.current_map
		var width = Data.maps[map].width
		var height = Data.maps[map].height

		var block_w = this.tile_w * this.meta_w
		var block_h = this.tile_h * this.meta_h

		var context = this.canvas.getContext('2d')
		var self = this
		var fillRect = function (x, y, w, h) {
			x *= self.scale * block_w
			y *= self.scale * block_h
			w *= self.scale * block_w
			h *= self.scale * block_h
			context.fillRect(x, y, w, h)
		}

		var connections = Data.maps[map].attributes.connections
		var cinfo = {}
		for (var c in connections) {
			var connection = connections[c]
			var info = getConnectionInfo(connection, Data.maps[map], Data.maps[connection.name])
			if (info) {
				cinfo[c] = info
			}
		}

		context.save()
		context.fillStyle = 'rgba(0, 0, 0, 0.2)'
		for (var y = 0; y < height + 6; y++)
		for (var x = 0; x < width + 6; x++) {
			if (y >= 3 && y < height + 3)
			if (x >= 3 && x < width + 3) {
				continue
			}
			var in_connection = false
			for (var dir in cinfo) {
				var c = cinfo[dir]
				if (y >= c.strip_y + 3 && y < c.strip_y + 3 + c.strip_height)
				if (x >= c.strip_x + 3 && x < c.strip_x + 3 + c.strip_width) {
					in_connection = true
					break
				}
			}
			if (in_connection) {
				continue
			}
			fillRect(x, y, 1, 1)
		}
		context.restore()
	},

	getSelection: function (event) {
		this.selection = getCanvasSelection(event, this.canvas, this.drawcanvas)
	},

	drawSelection: function () {

		if (!this.selection) {
			return
		}

		var context = this.canvas.getContext('2d')
		var self = this
		var fillRect = function (x, y, w, h) {
			x *= self.scale
			y *= self.scale
			w *= self.scale
			h *= self.scale
			context.fillRect(x, y, w, h)
		}

		var x = this.selection.x
		var y = this.selection.y

		var tile_w = this.tile_w
		var tile_h = this.tile_h
		var block_w = tile_w * this.meta_w
		var block_h = tile_h * this.meta_h

		context.save()

		context.globalCompositeOperation = 'lighten'

		context.fillStyle = 'rgba(255, 80, 80, 20)'
		fillRect(x - x % block_w, y - y % block_h, block_w, block_h)

		var coll_w = tile_w * 2
		var coll_h = tile_h * 2
		context.fillStyle = 'rgba(255, 170, 170, 20)'
		fillRect(x - x % coll_w,  y - y % coll_h,  coll_w,  coll_h)

		context.fillStyle = 'rgba(255, 80, 80, 20)'
		var connections = Data.maps[this.current_map].attributes.connections
		for (var direction in connections) {
			var connection = connections[direction]
			var info = getConnectionInfo(connection, Data.maps[this.current_map], Data.maps[connection.name])
			if (!info) continue

			var x1 = info.x1 * block_w
			var x2 = info.x2 * block_w
			var y1 = info.y1 * block_h
			var y2 = info.y2 * block_h
			if (x >= x1 && x < x2)
			if (y >= y1 && y < y2) {
				fillRect(x1, y1, x2-x1, y2-y1)
			}
		}

		context.restore()

	},

	getBlock: function (x, y) {
		var row = this.blockdata[x + 3]
		if (!row) {
			return undefined
		}
		return row[y + 3]
	},

	setBlock: function (x, y, block) {
		var width = Data.maps[this.current_map].width
		if (!this.blockdata[x + 3]) {
			this.blockdata[x + 3] = new Array(width + 6)
		}
		this.blockdata[x + 3][y + 3] = block
	},

	blockChanged: function (x, y, block) {
		return this.getBlock(x, y) !== block
	},

	drawMetatile: function (map, x, y, block, options) {
		map = map || this.current_map

		if (typeof block === 'undefined') {
			block = getBlock(map, x, y)
		}

		if (typeof block === 'undefined') {
			block = Data.maps[map].attributes.border_block
		}

		if (!this.blockChanged(x, y, block)) {
			return false
		} else {
			this.setBlock(x, y, block)
		}

		x += this.origin.x
		y += this.origin.y

		var meta_w = this.meta_w
		var meta_h = this.meta_h
		var tile_w = this.tile_w
		var tile_h = this.tile_h

		drawMetatile({
			x: x,
			y: y,
			block: block,
			tileset: getTileset(map),
			roof: Data.maps[map].header.group,
			permission: Data.maps[map].header.permission,
			context: this.drawcanvas.getContext('2d'),
			tile_w: tile_w,
			tile_h: tile_h,
			meta_w: meta_w,
			meta_h: meta_h,
		})

		if (options) {
			var block_w = meta_w * tile_w
			var block_h = meta_h * tile_h
			var drawcontext = this.drawcanvas.getContext('2d')
			drawcontext.save()
			Object.update(drawcontext, options)
			drawcontext.fillRect(x * block_w, y * block_h, block_w, block_h)
			drawcontext.restore()
		}

		return true
	},
}

var drawMetatile = function (props) {
	/*
	props: {x, y, block, tileset, context, tile_w, tile_h, meta_w, meta_h[, roof, permission]}
	*/

	var tiles = getTilesetTiles(props.tileset, props.roof)
	if (!tiles) {
		return false
	}

	var block_w = props.tile_w * props.meta_w
	var block_h = props.tile_h * props.meta_h
	var block = props.block < props.tileset.metatiles.length ? props.block : 0
	var metatile = props.tileset.metatiles[block]
	if (!metatile) return false
	var row_index = 0
	var tile_y = 0
	for (var y = 0; y < props.meta_h; y++) {
	for (var x = 0; x < props.meta_w; x++) {
		var cur_tile = metatile[x + row_index]
		if (cur_tile >= 0x80) {
			cur_tile -= 0x20
		}
		if (cur_tile >= tiles.length) {
			cur_tile = 0
		}
		var tile = tiles[cur_tile]
		props.context.drawImage(
			tile,
			props.x * block_w + x * props.tile_w,
			props.y * block_h + tile_y
		)
	}
		row_index += props.meta_w
		tile_y += props.tile_h
	}
	return true
}

function loadMapDimensions (name) {
	return getMapDimensions(name)
	.then(function (data) {
		Data.maps[name].group = data.group
		Data.maps[name].num = data.num
		Data.maps[name].width = data.width
		Data.maps[name].height = data.height
	})
}

function getMapDimensions (name) {

	var map_constant = Data.maps[name].attributes.map

	return getMapDimensionsText().then(function (text) {
		var group = 0
		var num = 0
		var r = rgbasm.instance()
		r.macros.newgroup = function (values) {
			group += 1
			num = 0
		}
		r.macros.mapgroup = function (values) {
			num += 1
			if (map_constant === values.shift()) {
				return {
					group: group,
					num: num,
					height: values.shift(),
					width: values.shift()
				}
			}
		}
		return r.read(text) || false
	})
}

function loadMap(name) {
	if (!Data.maps[name]) {
		Data.maps[name] = {}
	}
	var header_promise = Promise.all([
		loadMapHeader(name),
		loadMapAttributes(name),
	])
	var map_promise = header_promise.then(function () {
		return Promise.all([
			loadBlockdata(name),
			loadMapTileset(name),
			loadMapDimensions(name)
		])
	})
	var event_promise = header_promise.then(function () {
		return loadMapEvents(name)
	})

	loadFacings()

	return Promise.all([
		header_promise,
		map_promise,
	])
	.then(function () {
		Data.maps[name].loaded = true
	})
}

function loadBlockdata (name) {
	return config.getBlockdataPath(name)
	.then(function (path) {
		return Data.loadFile(path, { binary: true })
	})
	.then(function (blockdata) {
		Data.maps[name].blockdata = blockdata
	})
}

function loadMapTileset (name) {
	return Promise.all([
		loadTileset(Data.maps[name].header.tileset),
		loadMapRoof(name)
	])
	.then(function () {
		getTilesetWithRoof(Data.maps[name].header.tileset, Data.maps[name].header.group)
	})
}

function getConnectionInfo (connection, map, other) {

	if (!map) return false
	if (!other) return false

	var direction = connection.direction

	var strip_y = {
		north: -3,
		south: map.height,
		west: connection.align,
		east: connection.align,
	}[direction]

	var strip_x = {
		north: connection.align,
		south: connection.align,
		west: -3,
		east: map.width,
	}[direction]

	var strip_length = connection.strip_length

	var strip_height = {
		north: 3,
		south: 3,
		west: strip_length,
		east: strip_length,
	}[direction]

	var strip_width = {
		north: strip_length,
		south: strip_length,
		west: 3,
		east: 3,
	}[direction]

	var other_start = {
		north: connection.offset + other.width * (other.height - 3),
		south: connection.offset,
		west: other.width * connection.offset + other.width - 3,
		east: other.width * connection.offset,
	}[direction]

	var x1 = strip_x + 3
	var x2 = x1 + strip_width
	var y1 = strip_y + 3
	var y2 = y1 + strip_height

	return {
		strip_y: strip_y,
		strip_x: strip_x,
		strip_width: strip_width,
		strip_height: strip_height,
		other_start: other_start,
		x1: x1,
		x2: x2,
		y1: y1,
		y2: y2,
	}
}

function getMapBlock(map, x, y) {
	if (!map.blockdata) return -1
	return map.blockdata[x + y * map.width]
}

function setMapBlock(map, x, y, block) {
	if (y >= 0 && y < map.height)
	if (x >= 0 && x < map.width) {
		map.blockdata[x + y * map.width] = block
	}
}


function loadTileset (id) {
	if (!Data.tilesets[id]) {
		Data.tilesets[id] = { id: id, }
	}
	return Promise.all([
		loadMetatiles(id),
		loadPalmap(id),
		loadPalette(id),
		loadTilesetImage(id)
	])
	.then(function () {
		readTiles(id)
	})
}

function loadMetatiles(id) {
	config.getMetatilePath(id)
	.then(function (path) {
		return request(path, { binary: true })
	})
	.then(function (data) {
		return deserializeMetatiles(data)
	})
	.then(function (metatiles) {
		Data.tilesets[id].metatiles = metatiles
		Data.tilesets[id].blockdata = range(metatiles.length)
	})
}

function loadPalmap(id) {
	config.getPalmapPath(id)
	.then(function (path) {
		return request(path)
	})
	.then(function (data) {
		return deserializePalmap(data)
	}, function () {
		return [].concat(
			new Array(0x60).fill(0),
			new Array(0x80).fill(8)
		)
	})
	.then(function (palmap) {
		Data.tilesets[id].palmap = palmap
	})
}

function loadPalette(id) {
	return request(config.getPalettePath(id))
	.then(function (text) {
		var all_palettes = readPalette(text)
		var palettes = {}
		var times = ['morn', 'day', 'nite', 'dark']
		times.forEach(function (time, i) {
			var index = i * 8
			palettes[time] = all_palettes.slice(index, index + 8)
		})
		return palettes
	})
	.then(function (palettes) {
		Data.tilesets[id].palettes = palettes
	})
}

function loadTilesetImage(id) {
	var image = new Image()
	image.setAttribute('validate', 'always')

	return config.getTilesetImagePath(id)
	.then(function (path) {
		image.src = path

		return imagePromise(image)
		.then(function () {
			Data.tilesets[id].image = image
		}, function (event) {
			error(
				'Tileset image "' + path + '" doesn\'t exist.\n'
				+ 'Run: <div class="code">python gfx.py png ' + path.replace('../', '').replace('.png', '.2bpp.lz') + '</div>'
			)
		})

	})

}

function readTiles(id) {
	var tileset = Data.tilesets[id]
	var palette = tileset.palettes[config.time]
	var tiles = colorizeTiles(tileset.image, palette, tileset.palmap)
	Data.tilesets[id].tiles = tiles
}

function deserializeMetatiles (data) {
	var meta_w = 4
	var meta_h = 4
	var metatiles = subdivide(data, meta_w * meta_h)
	return metatiles
}

function deserializePalmap (data) {
	var colors = ['gray', 'red', 'green', 'water', 'yellow', 'brown', 'roof', 'text']
	var getColor = function (color) { return colors.indexOf(color.toLowerCase()) }

	var list = []
	var r = rgbasm.instance()
	r.macros.tilepal = function (values) {
		var bank = values.shift()
		while (values.length) {
			var value = values.shift()
			list.push((bank << 3) | getColor(value))
		}
	}
	r.macros.db = function (values) {
		while (values.length) {
			var value = values.shift()
			list.push((value >> 4) & 0xf)
			list.push(value & 0xf)
		}
	}
	r.read(data)
	return list
}

function readPalette (text, colors_per_pal) {
	if (typeof colors_per_pal === 'undefined') colors_per_pal = 4
	var palettes = subdivide(deserializeRGB(text), colors_per_pal)
	return palettes
}


function loadMapRoof (map_name) {
	var map = Data.maps[map_name]
	return loadRoof(map.header.group)
}

function loadRoof (roof) {
	if (!Data.roofs[roof]) {
		Data.roofs[roof] = {}
	}
	return Promise.all([
		loadRoofPalette(roof),
		loadRoofImage(roof)
	])
	.then(function () {
		//readRoofTiles(roof)
	})
}

function loadRoofPalette (roof) {
	return request(config.getRoofPalettePath(roof))
	.then(function (text) {
		var all_palettes = readPalette(text, 2)
		var palettes = {}
		var times = ['morn', 'day', 'nite', 'dark']
		times.forEach(function (time, i) {
			var index = roof * 2 + (i >> 1)
			palettes[time] = all_palettes[index]
		})
		return palettes
	})
	.then(function (palettes) {
		Data.roofs[roof].palettes = palettes
	})
}

function loadRoofImage(roof) {
	var image = new Image()
	var path = config.getRoofImagePath(roof)
	image.src = path
	image.setAttribute('validate', 'always')
	return imagePromise(image)
	.then(function () {
		Data.roofs[roof].image = image
	}, function (event) {
		error(
			'Roof image "' + path + '" doesn\'t exist.\n'
			+ 'Run: <div class="code">python gfx.py png ' + path.replace('../', '').replace('.png', '.2bpp') + '</div>'
		)
	})
}

function readRoofTiles(roof) {
	var roof = Data.roofs[roof]
	var palette = roof.palettes[config.time]
	var tiles = colorizeTiles(roof.image, palette)
	roof.tiles = tiles
}


function getTilesetWithRoof (id, r) {
	var tileset = Data.tilesets[id]
	var roof = Data.roofs[r]
	if (!tileset.with_roofs) {
		tileset.with_roofs = {}
	}
	if (!tileset.with_roofs[r]) {
		tileset.with_roofs[r] = {}
	}

	var palette = tileset.palettes[config.time].slice()
	var roof_palette = roof.palettes[config.time]
	if (typeof roof_palette !== 'undefined') {
		palette[6] = palette[6].slice()
		palette[6][1] = roof_palette[0]
		palette[6][2] = roof_palette[1]
	}

	var tiles = colorizeTiles(tileset.image, palette, tileset.palmap)
	tileset.with_roofs[r].tiles_just_palette = tiles

	var roof_tiles = colorizeTiles(roof.image, [palette[6]])
	tiles = mergeRoofTiles(tiles.slice(), roof_tiles)
	tileset.with_roofs[r].tiles = tiles
}

function mergeRoofTiles(tiles, roof_tiles) {
	roof_tiles.forEach(function (tile, i) {
		tiles[i + config.roof_start] = tile
	})
	return tiles
}


function deserializeRGB(text) {
	var colors = []
	var r = rgbasm.instance()
	r.macros.RGB = function (values) {
		colors.push(values.map(function (x) { return x * 8.25 }))
	}
	r.read(text)
	return colors
}

function colorizeTiles(img, palette, palmap) {

	var image = getRawImage(img)
	var data = image.imageData
	var width = image.width
	var height = image.height

	var tiles = []

	var x1 = 0, y1 = 0, x2, y2
	var pal
	for (var tile = 0; y1 < height; tile++) {

		x2 = x1 + 8
		y2 = y1 + 8

		if (palmap) {
			var i = palmap[tile >= 0x60 ? tile + 0x20 : tile]
			pal = palette[i & 7]
		} else {
			pal = palette[0]
		}

		var tileImage = colorize(image, pal, x1, y1, x2, y2)
		var tileCanvas = createElement('canvas', { width: 8, height: 8 })
		tileCanvas.getContext('2d').putImageData(tileImage, 0, 0)
		tiles.push(tileCanvas)

		x1 += 8
		if (x1 >= width) {
			x1 = 0
			y1 += 8
		}
	}

	return tiles

}

function colorize(image, palette, x1, y1, x2, y2) {
	var data = image.data
	var width = image.width
	var height = image.height
	if (x1 === undefined) x1 = 0
	if (y1 === undefined) y1 = 0
	if (x2 === undefined) x2 = width
	if (y2 === undefined) y2 = height
	var template = getImageTemplate(x2 - x1, y2 - y1)
	for (var y = y1; y < y2; y++)
	for (var x = x1; x < x2; x++) {
		var px = (x + y * width) * 4
		var tx = ((x - x1) + (y - y1) * (x2 - x1)) * 4
		var pi = 3 - data[px+0] / 85
		var color = palette[pi]
		var alpha = color[3]
		if (typeof alpha === 'undefined') {
			alpha = data[px+3]
		}
		template.data[tx+0] = color[0]|0
		template.data[tx+1] = color[1]|0
		template.data[tx+2] = color[2]|0
		template.data[tx+3] = alpha
	}
	return template
}


function getRawImage(img) {
	var ctx = createElement('canvas', { width: img.width, height: img.height }).getContext('2d')
	ctx.drawImage(img, 0, 0)
	var imageData = ctx.getImageData(0, 0, img.width, img.height)
	return imageData
}

function getImageTemplate(width, height) {
	var ctx = createElement('canvas', { width: width, height: height }).getContext('2d')
	return ctx.createImageData(width, height)
}


