var Promise = Promise || ES6Promise.Promise

String.prototype.contains = String.prototype.contains || function (term) {
	return this.indexOf(term) !== -1
}

var addQuery = function (url, query) {
	url += url.contains('?') ? '&' : '?'
	url += query
	return url
}

var isRightClick = function (event) {
	return event.which == 3 || event.button == 2
}

var range = function (length) {
	var list = []
	for (var i = 0; i < length; i++) {
		list.push(i)
	}
	return list
}

Object.update = Object.update || function (object, properties, options) {
	options = options || {
		careful: false, // Useful for updating trapped properties only when they're actually different.
	}
	for (var i in properties) {
		var prop = properties[i]
		if (!options.careful || object[i] !== prop) {
			object[i] = prop
		}
	}
	return object
}

var replaceChild = function (container, child) {
	var maybe = container.children[child.id]
	if (maybe !== undefined) {
		if (maybe !== child) {
			container.removeChild(maybe)
			container.appendChild(child)
		}
	} else {
		container.appendChild(child)
	}
}


var root = '../pokecrystal/'

var config = {

	time: 'day',
	default_map: 'OlivineCity',

	blockdata_dir:      root + 'maps/',
	tiles_dir:          root + 'gfx/tilesets/',
	palette_dir:        root + 'tilesets/',
	metatiles_dir:      root + 'tilesets/',
	collision_dir:      root + 'tilesets/',
	palmap_dir:         root + 'tilesets/',
	asm_dir:            root + 'maps/',
	ow_dir:             root + 'gfx/overworld/',
	map_header_path:    root + 'maps/map_headers.asm',
	map_header_2_path:  root + 'maps/second_map_headers.asm',
	map_constants_path: root + 'constants/map_constants.asm',


	default_map_header: {
		label: '',
		tileset: 1,
		permission: 0,
		location: 0,
		music: undefined,
		lighting: 0,
		fish: 1,
	},

	default_map_header_2: {
		label: '',
		map: undefined,
		border_block: 1,
		which_connections: '',
		connections: {},
	},

}

function main() {
	init()
}

function init() {

	ippon_manzoku = Object.create(Toolbar)
	ippon_manzoku.init()

	view = Object.create(MapViewer)
	view.init()

	picker = Object.create(MapPicker)
	painter = Object.create(Painter)

	setup(config.default_map)
	.then(function () {

		view.attach(document.body)
		view.run()

		picker.init(view)
		picker.attach(document.body)
		picker.run()

		painter.init(view)
		painter.run()

		view.history.init(view)
		view.commit()
	})
}

function setup (name) {

	return Promise.resolve()
	.then(function() {
		return loadConstants(config.map_constants_path)
	})
	.then(function () {
		return view.loadMap(name)
	})
}


var map_constants

function loadConstants (path) {
	return request(path)
	.then(function (text) {
		map_constants = constants(text)
	})
}


function getMapNames () {
	return request(config.map_header_path)
	.then(readMapNames)
}

function readMapNames (text) {
	var lines = text.split('\n')
	var start = '\tmap_header '
	lines = lines.filter(function (line) {
		return line.substr(0, start.length) === start
	})
	var names = lines.map(function (line) {
		return line.substr(start.length).split(',')[0]
	})
	names.sort()

	return names
}


print = console.log.bind(console)

function newMap (event) {
	print( 'new' )
}

function openMap (event) {
	var open_id = 'tooltip_open'
	var existing = document.getElementById(open_id)
	if (existing) {
		document.body.removeChild(existing)
	} else {
		var tooltip_div = createElement('div', {id: open_id, className: 'tooltip'})
		tooltip_div.style.visibility = 'hidden'

		var style = window.getComputedStyle(event.target)
		var left = [
			style.borderWidth,
			style.marginLeft, style.marginRight,
			style.paddingLeft, style.paddingRight,
			style.width
		].reduce(function (sum, x) {
			sum = sum || 0 // firefox
			return parseInt(sum)+ parseInt(x)
		})
		tooltip_div.style.left = left + 'px'

		document.body.appendChild(tooltip_div)

		var list_div = createElement('div', {className: 'map_list'})
		tooltip_div.appendChild(list_div)

		getMapNames()
		.then(function (names) {
			tooltip_div.style.visibility = ''

			var selected
			var select = function (div) {
				selected = div
				div.className += ' selected'
			}
			var deselect = function (div) {
				selected = undefined
				div.className = div.className.replace(/\bselected\b/g, '')
			}

			// populate the list with names
			names.map(function (name) {
				var name_div = createElement('div', {className: 'map_name'})
				name_div.innerHTML = name
				name_div.onclick = function (event_) {
					if (selected) deselect(selected)
					select(name_div)
					view.loadMap(name)
				}
				if (name === view.current_map.name) {
					select(name_div)
				}
				list_div.appendChild(name_div)
			})
		})
	}
}

function saveMap (event) {
	var filename = view.current_map.blockdata_path

	var data = new FormData()
	data.append('json', JSON.stringify({
		data: view.current_map.blockdata,
		filename: filename,
		command: 'save',
	}))

	request('', {
		method: 'POST',
		data: data,
	})
	.then(function () {
		print( 'saved', filename )
	})
}

function reloadMap (event) {
	view.loadMap(view.current_map.name)
	.then(function () {
		view.commit()
	})
}

function toggleBrightness (event) {

	var time = {
		day:  'nite',
		nite: 'morn',
		morn: 'day',
	}[config.time]

	setBrightness(time, event.target)
}

function setBrightness (time, element) {

	if (element) {
		element.style.color = {
			day:  '#aaa',
			nite: '#666',
			morn: '#888',
		}[time]

		element.innerHTML = {
			day:  '☀',
			nite: '🌙',
			morn: '☀',
		}[time]
	}

	config.time = time

	var promises = []
	promises.push(view.current_map.reloadTileset())
	for (var direction in view.current_map.connected_maps) {
		var map = view.current_map.connected_maps[direction]
		promises.push(map.reloadTileset())
	}
	return Promise.all(promises)
	.then(function () {
		view.redraw = true
		picker.redraw = true
	})
}

function undo (event) {
	view.undo()
}

function redo (event) {
	view.redo()
}


function createElement(type, properties) {
	type = type || 'div'
	properties = properties || {}
	var div = document.createElement(type)
	for (var k in properties) {
		div[k] = properties[k]
	}
	return div
}


var Toolbar = {

	init: function () {
		this.elem = this.createElement('div', {
			id: 'toolbar',
			className: 'toolbar',
		})

		this.buttons = {}
		for (var k in this.button_protos) {
			var button = this.createElement('div', this.button_protos[k])
			button.id = k
			button.className = 'tool'
			this.buttons[k] = button
			this.elem.appendChild(button)
		}

		document.body.appendChild(this.elem)
	},

	createElement: createElement,

	button_protos: {

		/*
		new: {
			innerHTML: 'New',
			onclick: newMap,
		},
		*/

		open: {
			innerHTML: '☰',
			onclick: openMap,
		},

		save: {
			innerHTML: '💾', //&#x1f4be;
			onclick: saveMap,
		},

		reload: {
			innerHTML: '⟳',
			onclick: reloadMap,
		},

		time: {
			innerHTML: '☀',
			onclick: toggleBrightness,
		},

		undo: {
			innerHTML: '↺',
			onclick: undo,
		},

		redo: {
			innerHTML: '↻',
			onclick: redo,
		},

	},

}



function getMapHeader(name) {
	return request(config.map_header_path)
	.then( function (text) { return readMapHeader(text, name) } )
}

function readMapHeader(text, name) {
	var lines = text.split('\n')
	var start = '\tmap_header ' + name + ','
	var line = findLineStart(lines, start)

	var attributes = [
		'label',
		'tileset',
		'permission',
		'location',
		'music',
		'lighting',
		'fish'
	]

	var header = getMacroAttributes(line, '\tmap_header ', attributes)
	return header
}

function createMapHeader() {
	return Object.create(config.default_map_header)
}

function getMapHeader2(name) {
	return request(config.map_header_2_path)
	.then( function (text) { return readMapHeader2(text, name) } )
}

function readMapHeader2 (text, name) {
	var lines = text.split('\n')
	var start = '\tmap_header_2 ' + name + ','
	var i = indexLineStart(lines, start)

	var line = lines[i]
	var attributes = [
		'label',
		'map',
		'border_block',
		'which_connections'
	]
	var header = getMacroAttributes(line, '\tmap_header_2 ', attributes)


	/* then read connections */

	i++
	header.connections = {}

	var directions = ['north', 'south', 'west', 'east']
	var direction
	for (var d = 0; d < directions.length; d++) {
		direction = directions[d]
		if (header.which_connections.indexOf(direction.toUpperCase()) > -1) {
			line = lines[i]
			if (line.indexOf(direction) > -1) {
				i++
				var connection_attributes = [
					'direction',
					'map',
					'name',
					'align',
					'offset',
					'strip_length',
					'current_map',
				]
				header.connections[direction] = getMacroAttributes(line, '\tconnection', connection_attributes)
			}
		}
	}

	return header
}

function createMapHeader2() {
	return Object.create(config.default_map_header_2)
}

function getMacroAttributes(line, macro_name, attributes) {
	var result = {}
	var macros = line.substr(macro_name.length).split(',')
	var value
	for (var i = 0; i < attributes.length; i++) {
		value = macros[i].trim().replace(/\$/g, '0x')
		result[attributes[i]] = value
		value = parseInt(value)
		if (value !== undefined && !Number.isNaN(value)) { result[attributes[i]] = value }
	}
	return result
}

function findLineStart(lines, start) {
	return lines[indexLineStart(lines, start)]
}

function indexLineStart(lines, start) {
	for (var i = 0; i < lines.length; i++) {
		if (lines[i].substr(0, start.length) === start) {
			return i
		}
	}
	return -1
}

var World = {

	maps: {},

	add: function (map) {
		this.maps[map.name] = map

		for (var direction in map.connected_maps) {
			var cmap = map.connected_maps[direction]
			this.add(cmap)
		}
	},

	getMap: function (name) {
		return this.maps[name]
	},

	loadMap: function (name) {
		var self = this
		var map = this.getMap(name)
		if (map !== undefined) {
			return map.reload()
			.then(function () {
				return map.loadConnections()
			})
		} else {
			map = Object.create(Map)
			return map.init(name)
			.then(function () {
				return map.loadConnections()
			})
			.then(function () {
				self.add(map)
			})
		}
	},

}

var getEventCoord = function (event) {
	var rect = event.target.getBoundingClientRect()
	return {
		x: (event.clientX - rect.left),
		y: (event.clientY - rect.top),
	}
}

var MapPicker = {

	get size () {
		return this.tileset.metatiles.length
	},
	get blockdata () {
		return range(this.size)
	},
	get height () {
		return Math.ceil(this.size / this.width)
	},

	init: function (viewer) {
		var self = this

		this.viewer = viewer
		this.tileset = viewer.current_map.tileset

		this.width = 4

		this.meta_w = 4
		this.meta_h = 4
		this.tile_w = 8
		this.tile_h = 8

		this.canvas = createElement('canvas', {
			id: 'picker',
			className: 'picker',
		})
		this.context = this.canvas.getContext('2d')

		this.drawcanvas = createElement('canvas')
		this.drawcontext = this.drawcanvas.getContext('2d')

		this.redraw = true

		this.attachPickerClickEvents()

		this.wrapper = createElement('div', {
			id: 'picker-wrapper',
			className: 'picker-wrapper',
		})
		this.container = createElement('div', {
			id: 'pickerbar',
			className: 'pickerbar',
		})
		this.container.appendChild(this.canvas)
		this.wrapper.appendChild(this.container)

	},

	attach: function (container) {
		container = container || document.body
		replaceChild(container, this.wrapper)
	},

	attachPickerClickEvents: function () {
		var self = this
		this.canvas.addEventListener('mousedown', function (event) {
			event.preventDefault()
		})
		this.canvas.addEventListener('mousemove', function (event) {
			self.getSelection(event)
		})
		this.canvas.addEventListener('mouseout', function (event) {
			self.selection = undefined
		})
		this.canvas.addEventListener('click', function (event) {
			self.getSelection(event)
			var x = self.selection.x
			var y = self.selection.y
			x = (x - (x % 32)) / 32
			y = (y - (y % 32)) / 32
			self.block = y * self.width + x
			self.viewer.paint_block = self.block
			event.preventDefault()
		})
	},

	getSelection: function (event) {
		this.selection = getEventCoord(event)
		this.selection.x *= this.drawcanvas.width / this.canvas.width
		this.selection.y *= this.drawcanvas.height / this.canvas.height
	},

	run: function () {
		var self = this
		function draw () {
			self.draw()
			window.requestAnimationFrame(draw)
		}
		window.requestAnimationFrame(draw)
	},

	draw: function () {

		var dimensions = {
			width:  this.width  * this.meta_w * this.tile_w,
			height: this.height * this.meta_h * this.tile_h,
		}

		Object.update(this.canvas, dimensions, { careful: true })
		Object.update(this.drawcanvas, dimensions, { careful: true })

		if (this.tileset !== this.viewer.current_map.tileset) {
			this.tileset = this.viewer.current_map.tileset
			this.redraw = true
		}

		if (this.tileset.redraw) {
			this.redraw = true
		}

		if (this.redraw) {
			this.render()
			this.redraw = false
		}

		this.context.drawImage(
			this.drawcanvas,
			0, 0, this.drawcanvas.width, this.drawcanvas.height,
			0, 0, this.canvas.width, this.canvas.height
		)

		this.drawSelection()
	},

	render: function () {
		for (var y = 0; y < this.height; y++)
		for (var x = 0; x < this.width; x++) {
			var block = y * this.width + x
			this.drawMetatile(x, y, block)
		}
	},

	drawMetatile: function (x, y, block) {
		drawMetatile({
			x: x,
			y: y,
			block: block,
			tileset: this.tileset,
			context: this.drawcontext,
			tile_w: this.tile_w,
			tile_h: this.tile_h,
			meta_w: this.meta_w,
			meta_h: this.meta_h,
		})
	},

	drawSelection: function () {
		if (!this.selection) return

		var x = this.selection.x
		var y = this.selection.y

		var tile_w = this.tile_w
		var tile_h = this.tile_h
		var block_w = tile_w * this.meta_w
		var block_h = tile_h * this.meta_h

		this.context.save()
		this.context.globalCompositeOperation = 'lighten'
		this.context.fillStyle = 'rgba(255, 80, 80, 20)'
		this.context.fillRect(x - x % block_w, y - y % block_h, block_w, block_h)
		//this.context.fillRect(x - x % tile_w, y - y % tile_h, tile_w, tile_h)
		this.context.restore()
	},

}

var Painter = {

	init: function (viewer) {
		this.viewer = viewer
	},

	run: function () {
		this.viewer.canvas.addEventListener('mousemove', this.update.bind(this))
		this.viewer.canvas.addEventListener('mousedown', this.update.bind(this))
		this.viewer.canvas.addEventListener('mouseup', function () { this.viewer.commit() }.bind(this))
		this.viewer.canvas.addEventListener('contextmenu', function (event) {
			event.preventDefault()
		})
	},

	update: function (event) {
		if (this.viewer.mousedown) {
			var x = this.viewer.selection.x
			var y = this.viewer.selection.y
			x = (x - (x % 32)) / 32
			y = (y - (y % 32)) / 32
			x -= this.viewer.origin.x
			y -= this.viewer.origin.y
			if (isRightClick(event)) {
				this.pick(this.viewer.getBlock(this.viewer.current_map, x, y))
			} else {
				this.paint(x, y)
			}
		}
	},

	pick: function (block) {
		this.viewer.paint_block = block
	},

	paint: function (x, y, block) {
		if (typeof block === 'undefined') block = this.viewer.paint_block
		this.viewer.current_map.setBlock(x, y, block)
	},

}

var History = {
	all: {},

	init: function (viewer) {
		this.viewer = viewer
	},

	add: function (name) {
		if (typeof this.all[name] === 'undefined') {
			this.all[name] = []
			this.all[name].index = -1
		}
	},

	get current () {
		var name = this.viewer.current_map.name
		var current = this.all[name]
		return current
	},

	set current (value) {
		var name = this.viewer.current_map.name
		this.all[name] = value
	},

	redo: function () {
		var min = Math.min
		this.current.index = min(this.current.index + 1, this.current.length - 1)
	},

	undo: function () {
		var max = Math.max
		this.current.index = max(this.current.index - 1, 0)
	},

	push: function (value) {

		// Don't be redundant
		var state = this.current[this.current.index]
		if (state) {
			if (value.every(function (v, i) { return v == state[i] })) return
		}

		if (this.current.length > this.current.index + 1) {
			var index = this.current.index
			this.current = this.current.slice(0, index + 1)
			this.current.index = index
		}
		this.current.push(value)
		this.current.index += 1
	},

}

var MapViewer = {

	world: World,

	history: History,
	commit: function () {
		this.history.add(this.current_map.name)
		this.history.push(this.current_map.blockdata.slice())
	},
	undo: function () {
		this.history.undo()
		this.current_map.blockdata = this.history.current[this.history.current.index].slice()
	},
	redo: function () {
		this.history.redo()
		this.current_map.blockdata = this.history.current[this.history.current.index].slice()
	},

	init: function () {
		var self = this

		this.canvas = createElement('canvas', {
			id: 'map_viewer',
			className: 'map_viewer',
		})

		this.context = this.canvas.getContext('2d')

		this.attachMapClickEvents()

		this.meta_w = 4
		this.meta_h = 4
		this.tile_w = 8
		this.tile_h = 8

		this.origin = {
			x: 3,
			y: 3,
		}

		this.paint_block = 1

		this.drawcanvas = document.createElement('canvas')
		this.drawcontext = this.drawcanvas.getContext('2d')


		this.container = createElement('div', {
			id: 'view_container',
			className: 'view_container',
		})
		this.container.appendChild(this.canvas)


		this.redraw = true
	},

	attach: function (container) {
		container = container || document.body
		replaceChild(container, this.container)
	},

	attachMapClickEvents: function () {

		var self = this

		this.canvas.addEventListener('mousedown', function (event) {
			self.mousedown = true
			event.preventDefault()
		})
		this.canvas.addEventListener('mouseup', function (event) {
			self.mousedown = false
			event.preventDefault()
		})
		this.canvas.addEventListener('mouseout', function (event) {
			self.selection = undefined
			self.mousedown = false
			event.preventDefault()
		})
		this.canvas.addEventListener('mousemove', function (event) {
			self.getSelection(event)
			event.preventDefault()
		})

		this.canvas.addEventListener('click', function (event) {
			self.getSelection(event)
			var x = self.selection.x / 32
			var y = self.selection.y / 32

			var connections = self.current_map.map_header_2.connections
			var connect = false
			for (var direction in connections) {
				var connection = connections[direction]
				var info = connection.info
				if (info)
				if (x >= info.x1 && x < info.x2)
				if (y >= info.y1 && y < info.y2) {
					connect = connection
					break
				}
			}
			if (connect) {
				print(connect.direction, 'to', connect.name)
				self.loadMap(connect.name)
			}
			event.preventDefault()
		})

	},

	getSelection: function (event) {
		this.selection = getEventCoord(event)
		this.selection.x *= this.drawcanvas.width / this.canvas.width
		this.selection.y *= this.drawcanvas.height / this.canvas.height
	},

	run: function () {
		var self = this
		function draw () {
			self.draw()
			window.requestAnimationFrame(draw)
		}
		window.requestAnimationFrame(draw)
	},

	loadMap: function(name) {
		var self = this
		return this.world.loadMap(name)
		.then(function () {
			self.addMap(self.world.getMap(name))
		})
	},

	getMap: function(name) {
		return this.world.getMap(name)
	},

	addMap: function(map) {
		var self = this
		this.current_map = map
		document.title = 'pokecrystal - ' + map.name
		this.blockdata = []
	},

	get mapList () {
		var list = []
		for (var name in this.world.maps) {
			list.push(this.world.maps[name])
		}
		return list
	},

	draw: function () {
		if (this.current_map) {
			if (this.redraw) {
				this.blockdata = []
				this.redraw = false
			}
			this.renderMap(this.current_map)
		}
	},

	renderMap: function (map) {

		var dimensions = {
			width:  (6 + map.width)  * this.meta_w * this.tile_w,
			height: (6 + map.height) * this.meta_h * this.tile_h,
		}

		Object.update(this.canvas, dimensions, { careful: true })
		Object.update(this.drawcanvas, dimensions, { careful: true })

		this.drawMap(map)
		this.drawMapBorder(map)
		this.drawConnections(map)

		this.context.drawImage(
			this.drawcanvas,
			0, 0, this.drawcanvas.width, this.drawcanvas.height,
			0, 0, this.canvas.width, this.canvas.height
		)

		this.drawSelection()

	},

	drawMap: function (map) {
		for (var y = 0; y < map.height; y++)
		for (var x = 0; x < map.width; x++) {
			this.drawMetatile(map, x, y)
		}
	},

	drawConnections: function (map) {

		var connections = map.map_header_2.connections
		for (var c in connections) {
			var connection = connections[c]
			var info = connection.info
			if (!info) continue

			var strip_x = info.strip_x
			var strip_y = info.strip_y
			var strip_width = info.strip_width
			var strip_height = info.strip_height
			var other_start = info.other_start

			var direction = connection.direction
			var other_map = map.connected_maps[direction]
			if (other_map.blockdata !== undefined) {

				for (var y = strip_y; y < strip_y + strip_height; y++)
				for (var x = strip_x; x < strip_x + strip_width; x++) {
					if (other_map.blockdata !== undefined) {

						var block = other_map.blockdata[
							other_start
							+ (x - strip_x)
							+ (y - strip_y) * other_map.width
						]

						/* connections compete with border, so maybe force for now */
						//this.setBlock(map, x, y, -1) // force
						this.drawMetatile(other_map, x, y, block)
					}
				}
			}
		}
	},

	drawMapBorder: function (map) {
		var border_block = map.map_header_2.border_block

		for (var y = -3; y < map.height + 3; y++)
		for (var x = -3; x < map.width + 3; x++) {
			if (y >= 0 && y < map.height) {
				if (x >= 0 && x < map.width) {
					x = map.width
				}
			}

			this.drawMetatile(map, x, y, border_block)
		}
	},

	drawSelection: function () {

		if (!this.selection) {
			return
		}

		var x = this.selection.x
		var y = this.selection.y

		var tile_w = this.tile_w
		var tile_h = this.tile_h
		var block_w = tile_w * this.meta_w
		var block_h = tile_h * this.meta_h

		this.context.save()
		this.context.globalCompositeOperation = 'lighten'
		this.context.fillStyle = 'rgba(255, 80, 80, 20)'
		this.context.fillRect(x - x % block_w, y - y % block_h, block_w, block_h)
		this.context.fillStyle = 'rgba(255, 170, 170, 20)'
		this.context.fillRect(x - x % tile_w,  y - y % tile_h,  tile_w,  tile_h)
		this.context.fillStyle = 'rgba(255, 80, 80, 20)'

		var connections = this.current_map.map_header_2.connections
		for (var direction in connections) {
			var connection = connections[direction]
			var info = connection.info
			if (!info) continue

			var x1 = info.x1 * block_w
			var x2 = info.x2 * block_w
			var y1 = info.y1 * block_h
			var y2 = info.y2 * block_h
			if (x >= x1 && x < x2)
			if (y >= y1 && y < y2) {
				this.context.fillRect(x1, y1, x2-x1, y2-y1)
			}
		}

		this.context.restore()

	},

	getBlock: function (map, x, y) {
		return this.blockdata[x + 3 + (y + 3) * (map.width + 6)]
	},

	setBlock: function (map, x, y, block) {
		this.blockdata[x + 3 + (y + 3) * (map.width + 6)] = block
	},

	blockChanged: function (map, x, y, block) {
		return this.getBlock(map, x, y) !== block
	},

	drawMetatile: function (map, x, y, block, config) {
		var meta_w = this.meta_w
		var meta_h = this.meta_h
		var tile_w = this.tile_w
		var tile_h = this.tile_h
		var block_w = meta_w * tile_w
		var block_h = meta_h * tile_h

		if (block === undefined) {
			block = map.getBlock(x, y)
		}

		if (!this.blockChanged(this.current_map, x, y, block)) {
			return false
		} else {
			this.setBlock(this.current_map, x, y, block)
		}

		var x_ = this.origin.x + x
		var y_ = this.origin.y + y

		drawMetatile({
			x: x_,
			y: y_,
			block: block,
			tileset: map.tileset,
			context: this.drawcontext,
			tile_w: tile_w,
			tile_h: tile_h,
			meta_w: meta_w,
			meta_h: meta_h,
		})

		if (config) {
			this.drawcontext.save()
			Object.update(this.drawcontext, config)
			this.drawcontext.fillRect(x_ * block_w, y_ * block_h, block_w, block_h)
			this.drawcontext.restore()
		}

		return true
	},

}

var drawMetatile = function (props) {
	/*
	props: {x, y, block, tileset, context, tile_w, tile_h, meta_w, meta_h}
	*/
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
		props.context.drawImage(
			props.tileset.tiles[cur_tile],
			props.x * block_w + x * props.tile_w,
			props.y * block_h + tile_y
		)
	}
		row_index += props.meta_w
		tile_y += props.tile_h
	}
	return true
}

var Map = {

	init: function (name) {

		this.name = name

		if (this.name) {
			return this.loadMap()
		} else {
			return this.createMap()
		}

	},

	reload: function () {
		return this.loadMap()
	},

	loadMap: function () {
		var self = this

		return Promise.all([
			getMapHeader(this.name),
			getMapHeader2(this.name)
		])
		.then(function (values) {
			self.map_header = values[0]
			self.map_header_2 = values[1]
			var base = self.map_header_2.map
			self.width = base + '_WIDTH'
			self.height = base + '_HEIGHT'
			self.width = getMapConstant(self.width)
			self.height = getMapConstant(self.height)
		})
		.then(function () {
			return self.loadBlockdata()
		})
		.then(function () {
			return self.loadTileset()
		})

	},

	loadConnections: function () {
		var self = this
		self.connected_maps = {}
		var connections = self.map_header_2.connections
		var promises = []
		var connection
		var other_map
		for (var direction in connections) {
			connection = connections[direction]
			/* TODO figure out whether to use World.getMap */
			other_map = Object.create(Map)
			self.connected_maps[direction] = other_map
			promises.push(
				other_map.init(connection.name)
				.then(function (connection, other_map) {
					connection.info = self.getConnectionInfo(connection, other_map)
				}.bind(this, connection, other_map))
			)
		}
		return Promise.all(promises)
	},

	getConnectionInfo: function (connection, other_map) {

		var direction = connection.direction

		var strip_y = {
			north: -3,
			south: this.height,
			west: connection.align,
			east: connection.align,
		}[direction]

		var strip_x = {
			north: connection.align,
			south: connection.align,
			west: -3,
			east: this.width,
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

		var other = other_map
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

	},

	get blockdata_path () {
		var path = config.blockdata_dir + this.name + '.blk'
		return path
	},

	loadBlockdata: function () {
		var self = this
		request(this.blockdata_path, { binary: true, cache: false })
		.then(function (blockdata) {
			self.blockdata = blockdata
		})
	},

	createMap: function () {

		this.map_header = createMapHeader()
		this.map_header_2 = createMapHeader2()

		this.createBlockdata()

		return this.loadTileset()

	},

	loadTileset: function () {
		var self = this
		var tileset = Object.create(Tileset)

		return tileset.init(this.map_header.tileset)
		.then(function () {
			self.tileset = tileset
		})
	},

	reloadTileset: function () {
		var self = this
		return this.tileset.init(this.map_header.tileset)
	},

	getBlock: function (x, y) {
		if (!this.blockdata) return -1
		return this.blockdata[x + y * this.width]
	},

	setBlock: function (x, y, block) {
		if (y >= 0 && y < this.height)
		if (x >= 0 && x < this.width) {
			this.blockdata[x + y * this.width] = block
		}
	},
}

function getNybbles(data) {

	var nybbles = []

	data.map(function (b) {
		nybbles.push (b & 0xf)
		nybbles.push (b >>> 4)
	})

	return nybbles
}

var Tileset = {

	init: function (id) {
		var self = this
		this.id = id

		return Promise.all([
			request(this.metatile_path, { binary: true }),
			request(this.palmap_path, { binary: true }),
			request(this.palette_path),
			new Promise( function (resolve, reject) {
				self.image = new Image()
				self.image.src = self.image_path
				self.image.onload = resolve
			})
		])
		.then( function (values) {
			self.metatiles = self.serializeMetatiles(values.shift())
			self.palmap = self.serializePalmap(values.shift())
			self.palette = self.readPalette(values.shift())
			self.getColorizedTiles()
			self.redraw = true
		})
	},

	serializeMetatiles: function (data) {

		var metatiles = []
		var meta_w = 4
		var meta_h = 4
		var metatile
		var index
		for (var i = 0; (index = i * meta_w * meta_h) < data.length; i++) {
			metatile = []
			for (var j = 0; j < meta_w * meta_h; j++) {
				metatile.push(data[index + j])
			}
			metatiles.push(metatile)
		}
		return metatiles

	},

	serializePalmap: function (data) {
		return getNybbles(data)
	},

	readPalette: function (text) {
		return divvy(serializeRGB(text), 4)
	},

	updatePalette: function () {
		request(this.palette_path)
	},

	getColorizedTiles: function () {
		this.tiles = colorizeTiles(this.image, this.palette, this.palmap)
	},

	get metatile_path () {
		var path = config.metatiles_dir + this.id.toString().zfill(2) + '_metatiles.bin'
		return path
	},

	get palmap_path () {
		var path = config.palmap_dir + this.id.toString().zfill(2) + '_palette_map.bin'
		return path
	},

	get image_path () {
		var path = config.tiles_dir + this.id.toString().zfill(2) + '.png'
		return path
	},

	get palette_path () {
		var path = config.palette_dir + config.time + '.pal'
		return path
	},

}

function canvas(properties) {
	return createElement('canvas', properties)
}


function request(url, options) {
	return new Promise( function (resolve, reject) {
		ajax(url, resolve, options)
	})
}

function ajax(url, cb, options) {
	options = options || {}
	options = Object.update({
		binary: false,
		method: 'GET',
		data: undefined,
		cache: false,
	}, options)

	if (options.cache === false && options.method !== 'POST') {
		url = addQuery(url, Date.now())
	}

	var xhr = new XMLHttpRequest()
	xhr.open(options.method, url, !!cb)
	if (options.binary) {
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
	}
	if (cb) {
		xhr.onload = function () {
			var response = xhr.responseText
			if (options.binary) {
				data = []
				for (var i = 0; i < response.length; i++) {
					data.push(response.charCodeAt(i) & 0xff)
				}
				cb(data)
			} else {
				cb(response)
			}
		}
	}
	xhr.send(options.data)
}




function getPalettes(url) {
	var palettes = [];
	var pals = loadTextFile(url);
	var colors_per_pal = 4;
	/* asm.js stuff here*/
	var lines = pals.split('\n');
	var line;
	var palette = [];
	for (var i = 0; i < lines.length; i++) {
		line  = lines[i];
		if (line !== '') {
			color = macroValues(line, 'RGB');
			if (palette.length >= colors_per_pal) {
				palettes.push(palette);
				palette = [];
			}
			palette.push(color);
		}
	}
	if (palette.length) {
		palettes.push(palette);
	}
	return palettes;
}


function divvy(list, length) {
	var new_list = []
	for (var i = 0; i < list.length; i += length) {
		new_list.push(list.slice(i, i + length))
	}
	return new_list
}

function serializeRGB(text) {
	var colors = []
	var lines = text.split('\n')
	lines.forEach(function (line) {
		var color = macroValues(line, 'RGB')
		if (color) {
			colors.push(color.map(function (x) {
				return x * 8
			}))
		}
	})
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

		pal = palette[palmap[tile >= 0x60 ? tile + 0x20 : tile] & 7]

		var tileImage = colorize(image, pal, x1, y1, x2, y2)
		var tileCanvas = canvas({ width: 8, height: 8 })
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
	var px, pi, color
	for (var y = y1; y < y2; y++)
	for (var x = x1; x < x2; x++) {
		px = (x + y * width) * 4
		tx = ((x - x1) + (y - y1) * (x2 - x1)) * 4
		pi = 3 - data[px+0] / 85
		color = palette[pi]
		template.data[tx+0] = color[0]|0
		template.data[tx+1] = color[1]|0
		template.data[tx+2] = color[2]|0
		template.data[tx+3] = data[px+3]
	}
	return template
}


function getRawImage(img) {
	var ctx = canvas({ width: img.width, height: img.height }).getContext('2d')
	ctx.drawImage(img, 0, 0)
	var imageData = ctx.getImageData(0, 0, img.width, img.height)
	return imageData
}

function getImageTemplate(width, height) {
	var ctx = canvas({ width: width, height: height }).getContext('2d')
	return ctx.createImageData(width, height)
}


String.prototype.repeat = function(length) {
	return new Array(length + 1).join(this);
}

String.prototype.zfill = function(length) {
	return '0'.repeat(length - this.length) + this;
}

