var root = '../'

var config = {
	root: root,

	time: 'day',
	default_map: 'OlivineCity',

	asm_dir:            root + 'maps/',
	ow_dir:             root + 'gfx/overworld/',

	map_header_path:    root + 'maps/map_headers.asm',
	map_header_2_path:  root + 'maps/second_map_headers.asm',
	map_constants_path: root + 'constants/map_constants.asm',
	map_dimensions_path: root + 'constants/map_constants.asm',

	roofs: [ -1, 3, 2, -1, 1, 2, -1, -1, 2, 2, 1, 4, -1, -1, -1, -1, -1, -1, -1, 0, -1, -1, 3, -1, 0, -1, 0 ],
	//roof_permissions: [ 1, 'TOWN', 2, 'ROUTE', 4, 'CAVE' ], // wrong, see roof_tilesets
	roof_tilesets: [
		1, 'TILESET_JOHTO_1',
		2, 'TILESET_JOHTO_2',
		4, 'TILESET_BATTLE_TOWER_OUTSIDE',
	],
	roof_start: 0xa,

	max_blocks: 1300,

	getTilesetConstants: function () {
		return request(root + 'constants/tilemap_constants.asm')
		.then(read_constants)
		.then(function (constants) {
			var filtered = {}
			for (constant in constants) {
				if (constant.search(/^TILESET_/) >= 0) {
					filtered[constant] = constants[constant]
				}
			}
			return filtered
		})
	},
	getTilesetId: function (name) {
		return this.getTilesetConstants()
		.then(function (constants) {
			return constants[name]
		})
	},

	getTilesetImagePath: function (id) {
		return this.getTilesetId(id)
		.then(function (i) {
			return root + 'gfx/tilesets/' + zfill(i, 2) + '.png'
		})
	},

	getBlockdataPath: function (name) {
		var filenames = [
			'maps/blockdata_1.asm',
			'maps/blockdata_2.asm',
			'maps/blockdata_3.asm',
			'maps.asm', // newMap() dumps blockdata here
		]
		return Promise.all(filenames.map(function (filename) {
			return request(root + filename)
		}))
		.then(function (texts) {
			var r = rgbasm.instance()
			var ready = false
			r.callbacks.label = function (line) {
				if (line.label === name + '_BlockData') {
					ready = true
				}
			}
			r.macros.INCBIN = function (values) {
				if (ready) {
					var filename = values[0].split('"')[1]
					return filename
				}
			}
			for (var i = 0; i < texts.length; i++) {
				var text = texts[i]
				var result = r.read(text)
				if (result) return root + result
			}
		})
	},

	getMetatilePath: function (id) {
		return this.getTilesetId(id)
		.then(function (i) {
			return root + 'tilesets/' + zfill(i, 2) + '_metatiles.bin'
		})
	},
	getPalmapPath: function (id) {
		return this.getTilesetId(id)
		.then(function (i) {
			return root + 'tilesets/' + zfill(i, 2) + '_palette_map.asm'
		})
	},
	getPalettePath: function () { return root + 'tilesets/bg.pal' },
	getObjectPalettePath: function () { return root + 'tilesets/ob.pal' },
	getRoofPalettePath: function () { return root + 'tilesets/roof.pal' },

	getRoofImagePath: function (group) {
		var roof = this.roofs[group]
		if (roof === -1 || typeof roof === 'undefined') {
			roof = 0
		}
		return root + 'gfx/tilesets/roofs/' + roof + '.png'
	},

	default_map_header: {
		label: '',
		tileset: 'TILESET_JOHTO_1',
		permission: 0,
		location: 'SPECIAL_MAP',
		music: 'MUSIC_NONE',
		lighting: 0,
		fish: 1,
	},

	default_map_header_2: {
		label: '',
		map: undefined,
		border_block: 0,
		which_connections: '',
		connections: {},
	},

	// not hardcoding these means reading code
	movement_facings: [
		0,
		0, // standing
		0, // random_walk_xy
		0, // slow random spin
		0, // random walk y
		0, // random walk x
		0, // standing down
		4, // standing up
		8, // standing left
		12, // standing right
		0, // fast random spin
		0, // obey dpad (player)
		0, // 8 unknown
		0, // 9 unknown
		0, // a unknown
		0, // b unknown
		0, // c unknown
		0, // d unknown
		0, // e unknown
		0, // follow
		0, // scripted?
		23, // snorlax
		0, // bounce?
		0, // standing // sudowoodo
		0, // standing // rock
		0, // boulder
		0, // follownotexact
		0, // shadow
		0, // emote
		0,
		0,
		0,
		22,
		function (npc) {
			if (npc.sprite === 'SPRITE_BIG_SNORLAX') return 23
			if (npc.sprite === 'SPRITE_BIG_LAPRAS') return 23
			return 22
		}, // big doll
		0, // boulder dust
		0, // grass
		0, // lapras
		0,
	],

}

config.getFacing = function (npc) {
	var constant = Data.constants[npc.movement]
	var i = config.movement_facings[constant]
	if (typeof i === 'function') i = i(npc)
	var facing = Data.facings[i]
	return facing
}

config.getNpcTiles = function (npc) {
	if (npc.last_sprite !== npc.sprite || npc.last_color !== npc.color) {
		config.loadNpcGraphics(npc)
		npc.last_sprite = npc.sprite
		npc.last_color = npc.color
	}
	return (Data.sprites[npc.sprite] || {})[npc.color]
}

config.loadNpcGraphics = function (npc) {
	var pal_promise = request(config.getObjectPalettePath())
	.then(function (text) {
		var palettes = readPalette(text)
		var color = npc.color
		if (typeof color === 'string') {
			color = npc.color.match(/PAL_OW_([A-Z]*)/)[1]
			color = ['red', 'blue', 'green', 'brown', 'pink', 'silver', 'tree', 'rock'].indexOf(color.toLowerCase())
			if (color === -1) {
				color = 0
			}
		} else {
			// TODO default color
		}
		var palette = [palettes[color]]
		palette[0][0][3] = 0
		return palette
	})

	var image_promise = config.getSpritePath(npc.sprite)
	.then(function(path) {
		var image = newImage(path)
		return imagePromise(image)
		.then(function () { return image })
	})

	return Promise.all([image_promise, pal_promise])
	.then(function (results) {
		var tiles = colorizeTiles(results.shift(), results.shift())
		Data.sprites[npc.sprite] = Data.sprites[npc.sprite] || {}
		Data.sprites[npc.sprite][npc.color] = tiles
	})
}


function named_args(names, values) {
	var object = {}
	names.forEach(function (key) {
		object[key] = values.shift()
	})
	return object
}

config.macros = {
	warp: ['warp_def', 'y', 'x', 'map_warp', 'map'],
	trap: ['xy_trigger', 'trigger', 'y', 'x', 'unknown1', 'script', 'unknown2', 'unknown3'],
	sign: ['signpost', 'y', 'x', 'function', 'script'],
	npc: ['person_event', 'sprite', 'y', 'x', 'movement', 'radius_y', 'radius_x', 'clock_hour', 'clock_daytime', 'color', 'function', 'sight_range', 'script', 'event_flag'],
}

function readEventText (text) {
	var r = rgbasm.instance()
	var objects = {}
	function add_macro (name) {
		var arg_names = config.macros[name].slice()
		var macro_name = arg_names.shift()
		if (typeof objects[name] === 'undefined') {
			objects[name] = []
		}
		r.macros[macro_name] = function (values) {
			var npc = named_args(arg_names, values)
			npc.__type__ = name
			objects[name].push(npc)
		}
	}
	add_macro('warp')
	add_macro('trap')
	add_macro('sign')
	add_macro('npc')
	r.read(text)
	return {
		warps: objects.warp,
		traps: objects.trap,
		signs: objects.sign,
		npcs: objects.npc,
	}
}

function parseEvents (objects) {
	var all_obj = []
	var obj_keys = ['warp', 'trap', 'sign', 'npc']
	obj_keys.forEach(function (name) {
		var npcs = objects[name + 's'] || []
		npcs.forEach(function (npc) {
			npc.element = createElement('div', { className: 'event ' + name })
			npc.container = createElement('div', { className: 'event_container ' + name })
			npc.container.appendChild(npc.element)
		})
		all_obj = all_obj.concat(npcs)
	})

	all_obj.forEach(function (npc) {
		var callback = {
			npc: npcEventDialog,
			warp: warpEventDialog,
			sign: signEventDialog,
			trap: trapEventDialog,
		}[npc.__type__] || function () {}

		addStationaryClickListener(npc.element, function (event) {
			callback(npc, objects)
		})
	})

	all_obj.forEach(function (npc) {
		// Make events draggable.
		npc.element.addEventListener('mousedown', function (event) {
			if (isRightClick(event)) {
				return
			}
			var drag = function (event) {
				var rect = view.canvas.getBoundingClientRect()
				var x = event.clientX - rect.left
				if (x < 0) x -= 16
				x = (x - (x % 16)) / 16
				var y = event.clientY - rect.top
				if (y < 0) y -= 16
				y = (y - (y % 16)) / 16
				npc.x = Math.floor(x) - 6
				npc.y = Math.floor(y) - 6
				if (npc.dialog && npc.dialog.update) {
					npc.dialog.update()
				}
			}
			window.addEventListener('mousemove', drag)
			window.addEventListener('mouseup', function stop (event) {
				window.removeEventListener('mousemove', drag)
				window.removeEventListener('mouseup', stop)
			})
		})
		npc.element.ondragstart = function () { return false }
	})

	all_obj.forEach(function (npc) {
		// Have a grabby hand when moving npcs around.
		npc.element.style.webkitUserSelect = 'none'
		npc.element.style.mozUserSelect = 'none'
		npc.element.style.cursor = '-webkit-grab'
		var last_cursors = []
		npc.element.addEventListener('mousedown', function (event) {
			if (isRightClick(event)) {
				return
			}
			npc.element.style.cursor = '-webkit-grabbing'
			last_cursors.push(document.body.style.cursor)
			document.body.style.cursor = '-webkit-grabbing'
			window.addEventListener('mouseup', function remove (event) {
				npc.element.style.cursor = '-webkit-grab'
				document.body.style.cursor = last_cursors.pop()
				window.removeEventListener('mouseup', remove)
			})
		})
		npc.element.addEventListener('drag', function (event) {
			event.preventDefault()
		})
	})

	all_obj.forEach(function (npc) {
		// Show the coordinates of the npc you're moving around.
		var info = createElement('div', { className: 'tooltip', })
		var update = function (event) {
			if (!npc.dialog) {
				info.innerHTML = '(' + npc.x + ', ' + npc.y + ')'
				info.style.display = ''
			} else {
				info.style.display = 'none'
			}
		}
		addDragInfo(npc.element, info, update)
	})

	var warps = objects.warps
	warps.forEach(function (warp) {

		// Right click on a warp to go to the destination map.
		warp.element.addEventListener('contextmenu', function (event) {
			event.preventDefault()
			mapConstantToLabel(warp.map)
			.then(function (map_name) {
				console.log('warp to ' + map_name)
				gotoMap(map_name)
			})
		})

		// Hover over a warp to show the destination map.
		var info = createElement('div', { className: 'tooltip' })

		var last_map
		addHoverInfo(warp.element, info, function () {
			if (last_map !== warp.map) {
				last_map = warp.map
				info.innerHTML = ''
				mapConstantToLabel(warp.map)
				.then(function (map_name) {
					info.innerHTML = map_name
				})
			}
		})
	})

	all_obj.forEach(function (npc) {
		var info = createElement('div', { className: 'tooltip' })
		addHoverInfo(npc.element, info, function () {
			if (npc.script) {
				info.innerHTML = npc.script
				info.style.display = undefined
			} else {
				info.style.display = 'none'
			}
		})
	})

	objects.npcs.forEach(function (npc) {
		npc.canvas = createElement('canvas', { className: 'npc_canvas' })
		npc.element.appendChild(npc.canvas)
	})

	return objects
}

function newImage (path) {
	var image = new Image()
	image.src = path
	image.setAttribute('validate', 'always')
	return image
}

function loadFacings() {
	return request(root + 'engine/facings.asm')
	.then(parseFacings)
	.then(function (facings) {
		Object.update(Data.facings, facings)
		return request(root + 'constants/sprite_constants.asm')
		.then(read_constants)
	})
	.then(function (constants) {
		for (constant in constants) {
			Data.constants[constant] = constants[constant]
		}
	})
}

function parseFacings(text) {

	var facings = []

	var labels = []
	var facing = {}
	var tile = []
	var r = rgbasm.instance()
	r.callbacks.label = function (line) {
		// Labels can stack, so assign the same facing to stacked labels
		if (facing.count) {
			facing = {}
		}
		facings[line.label] = facing
	}
	r.macros.dw = function (values) {
		labels.push(values[0])
	}
	r.macros.db = function (values, line) {
		if (!facing.count) {
			facing.count = line.values.shift()
		}
		if (!facing.tiles) {
			facing.tiles = []
		}
		line.values.forEach(function (value) {
			if (facing.tiles.length >= facing.count) {
				return
			}
			tile.push(value)
			if (tile.length >= 4) {
				facing.tiles.push({
					y: r.eval(tile[0]),
					x: r.eval(tile[1]),
					attr: tile[2],
					tile: r.eval(tile[3]),
				})
				tile = []
			}
		})
	}
	r.read(text)

	labels.forEach(function (label) {
		facings.push(facings[label])
	})

	facings.forEach(function (facing) {
		var max = function (a, b) { return Math.max(a, b) }
		var min = function (a, b) { return Math.min(a, b) }
		var xs = facing.tiles.map(function (tile) { return tile.x })
		var ys = facing.tiles.map(function (tile) { return tile.y })
		var left = xs.reduce(min)
		var right = xs.reduce(max) + 8
		var top = ys.reduce(min)
		var bottom = ys.reduce(max) + 8
		facing.width = right - left
		facing.height = bottom - top
	})

	return facings
}

config.getSpritePath = function (constant) {
	return getSpriteConstants()
	.then(function (constants) {
		var sprite_id = constants[constant] - 1
		if (sprite_id < 0) {
			sprite_id = 0
		}
		if (sprite_id > 102) {
			sprite_id = 0
		}
		return root + 'gfx/overworld/' + sprite_id.toString().zfill(3) + '.png'
	})
}

config.getMapEventPath = function (map_name) {
	return root + 'maps/' + map_name + '.asm'
}

config.readEvents = function (map_name) {
	return Data.loadFile(this.getMapEventPath(map_name))
	.then(function (text) {
		return readEventText(text, map_name)
	})
}

function getSpriteConstants() {
	return getSpriteConstantsText().then(read_constants)
}

function getSpriteConstantsText() {
	return request(root + 'constants/sprite_constants.asm')
}

function getMapConstants() {
	return getMapConstantsText().then(read_constants)
}

function getMapConstantsText() {
	return request(config.map_constants_path)
}

function getMapDimensionsText() {
	return request(config.map_dimensions_path)
}

function read_constants(text) {
	var constants = {}
	var r = rgbasm.instance()
	set = function(values) {
		var key = values.shift()
		var value = values.shift()
		constants[key] = value
	}
	r.infix['='] = set
	r.infix.SET = set
	r.infix.EQU = set
	r.macros.const_def = function (values) {
		constants.const_value = values.shift() || 0
	}
	r.macros.const = function (values) {
		set(values.concat(constants.const_value))
		constants.const_value += 1
	}
	r.read(text)
	return constants
}

function updateCursorInfo (event) {
	var info = document.getElementById('cursor_info')
	if (info.children.length) {
		info.style.left = event.pageX + 'px'
		info.style.top = event.pageY + 'px'
	}
}

function addHoverInfo(target, div, callback) {
	var update = function (event) {
		updateCursorInfo(event)
		if (callback) {
			callback(event)
		}
	}
	var dragging = false
	target.addEventListener('mousedown', function () { dragging = true })
	window.addEventListener('mouseup', function () { dragging = false })
	target.addEventListener('mouseenter', function self (event) {
		document.getElementById('cursor_info').appendChild(div)
		update(event)
		window.addEventListener('mousemove', update)
		var remove = function remove (event) {
			if (!dragging) {
				window.removeEventListener('mousemove', update)
				target.removeEventListener('mouseout', remove)
				document.body.removeEventListener('mouseover', remove)
				if (div.parentNode) div.parentNode.removeChild(div)
				target.addEventListener('mouseenter', self)
			}
		}
		target.addEventListener('mouseout', remove)
		document.body.addEventListener('mouseover', remove)
		target.removeEventListener('mouseenter', self)
	})
}

function addDragInfo(target, div, callback) {
	var update = function (event) {
		updateCursorInfo(event)
		if (callback) {
			callback(event)
		}
	}
	target.addEventListener('mousedown', function (event) {
		if (isRightClick(event)) {
			return
		}
		document.getElementById('cursor_info').appendChild(div)
		update(event)
		window.addEventListener('mousemove', update)
		window.addEventListener('mouseup', function remove (event) {
			window.removeEventListener('mousemove', update)
			window.removeEventListener('mouseup', remove)
			if (div.parentNode) {
				div.parentNode.removeChild(div)
			}
		})
	})
}

function addStationaryClickListener(target, callback) {
	function mousemove (event) {
		if (event.movementX || event.movementY) {
			window.removeEventListener('mousemove', mousemove)
			window.removeEventListener('mouseup', mouseup)
		}
	}
	function mouseup (event) {
		window.removeEventListener('mousemove', mousemove)
		window.removeEventListener('mouseup', mouseup)
		callback(event)
	}
	target.addEventListener('mousedown', function (event) {
		if (!isRightClick(event)) {
			window.addEventListener('mousemove', mousemove)
			window.addEventListener('mouseup', mouseup)
		}
	})
}


function getMapGroups () {
	return request(config.map_header_path)
	.then(readMapGroups)
}

function readMapGroups (text) {
	var group_names = []
	var groups = []

	var r = rgbasm.instance()
	var group
	r.macros.dw = function (values) {
		group_names.push(values[0])
	}
	r.callbacks.label = function (line) {
		group = {
			name: line.label,
			maps: [],
		}
		groups.push(group)
	}
	r.macros.map_header = function (values) {
		group.maps.push(values[0])
	}
	r.read(text)

	groups = groups.filter(function (group) { return group_names.contains(group.name) })
	groups.sort(function (a, b) {
		return group_names.indexOf(a.name) - group_names.indexOf(b.name)
	})

	return groups
}

function getMapGroupNames () {
	return request(config.map_header_path)
	.then(readMapGroupNames)
}

function readMapGroupNames (text) {
	var names = []
	var r = rgbasm.instance()
	r.macros.dw = function (values) {
		names.push(values[0])
	}
	r.read(text)
	return names
}

function getMapNames () {
	return request(config.map_header_path)
	.then(readMapNames)
}

function readMapNames (text) {
	var names = []
	var r = rgbasm.instance()
	r.macros.map_header = function (values) {
		names.push(values[0])
	}
	r.read(text)
	return names
}

function getMapHeader(name) {
	return request(config.map_header_path)
	.then( function (text) { return readMapHeader(text, name) } )
}

function readMapHeader(text, name) {

	// Find all the group names.
	var r = rgbasm.instance()
	var groups = []
	r.macros.dw = function (values) {
		groups.push(values[0])
	}
	r.read(text)

	// Find the map header definition, and its group.
	var r = rgbasm.instance()
	var group = 0
	var num = 0
	r.callbacks.label = function (line) {
		group = groups.indexOf(line.label) + 1
		num = 0
	}
	r.macros.map_header = function (values) {
		num += 1
		var map_name = values[0]
		if (map_name === name) {
			return values
		}
	}
	var values = r.read(text)

	var names = ['label', 'tileset', 'permission', 'location', 'music', 'lighting1', 'lighting2', 'fish']
	var header = dictzip(names, values)
	header.group = group
	header.num = num
	return header
}


function getMapHeader2(name) {
	return request(config.map_header_2_path)
	.then( function (text) { return readMapHeader2(text, name) } )
}

function readMapHeader2 (text, name) {

	var r = rgbasm.instance()
	var parse_connections = false
	var header_values = []
	var connections = []
	r.macros.map_header_2 = function (values) {
		var map_name = values[0]
		if (map_name === name) {
			parse_connections = true
			header_values = values
		} else {
			parse_connections = false
		}
	}
	r.macros.connection = function (values) {
		if (parse_connections) {
			connections.push(values)
		}
	}
	r.read(text)

	var values = header_values
	var names = ['label', 'map', 'border_block', 'which_connections']
	var header = dictzip(names, values)

	header.connections = {}
	connections.forEach(function (values) {
		var names = ['direction', 'map', 'name', 'align', 'offset', 'strip_length', 'current_map']
		var connection = dictzip(names, values)
		header.connections[connection.direction] = connection
	})

	return header
}

function serializeMapEvents (events) {
	var text = ''
	function serialize (name) {
		return function (npc) {
			var arg_names = config.macros[name].slice()
			var macro_name = arg_names.shift()
			text += '\t' + macro_name + ' ' + arg_names.map(function (key) { return npc[key] }).join(', ') + '\n'
		}
	}
	text += '_MapEventHeader:: db 0, 0\n'
	text += '\n.Warps: db ' + events.warps.length + '\n'
	events.warps.forEach(serialize('warp'));
	text += '\n.CoordEvents: db ' + events.traps.length + '\n'
	events.traps.forEach(serialize('trap'));
	text += '\n.BGEvents: db ' + events.signs.length + '\n'
	events.signs.forEach(serialize('sign'));
	text += '\n.ObjectEvents: db ' + events.npcs.length + '\n'
	events.npcs.forEach(serialize('npc'));
	return text
}

config.serializeMapHeader = function (header) {
	var arg_names = ['label', 'tileset', 'permission', 'location', 'music', 'lighting1', 'lighting2', 'fish']
	return '\t' + 'map_header' + ' ' + arg_names.map(function (key) { return header[key] }).join(', ') + '\n'
}

config.serializeMapHeader2 = function (header) {
	var arg_names = ['label', 'map', 'border_block', 'which_connections']
	var text = ''
	text += '\t' + 'map_header_2' + ' ' + arg_names.map(function (key) { return header[key] }).join(', ') + '\n'
	text += config.serializeConnections(header.connections)
	return text
}

config.serializeConnections = function (connections) {
	var text = ''
	var directions = ['north', 'south', 'west', 'east']
	directions.forEach(function (direction) {
		if (connections[direction]) {
			text += config.serializeConnection(connections[direction])
		}
	})
	return text
}

config.serializeConnection = function (connection) {
	var arg_names = ['direction', 'map', 'name', 'align', 'offset', 'strip_length', 'current_map']
	return '\t' + 'connection' + ' ' + arg_names.map(function (key) { return connection[key] }).join(', ') + '\n'
}

config.serializeMapDimensions = function (map) {
	return '\t' + 'mapgroup' + ' ' + [map.attributes.map, map.height, map.width].join(', ') + '\n'
}

function readMapHeader2ByConstant(text, name) {
	var r = rgbasm.instance()
	r.macros.map_header_2 = function (values) {
		var map_constant = values[1]
		if (map_constant === name) {
			return values
		}
	}
	var values = r.read(text)
	var names = ['label', 'map', 'border_block', 'which_connections']
	var header = dictzip(names, values)
	return header
}

function mapConstantToLabel (constant) {
	return request(config.map_header_2_path)
	.then(function (text) {
		return readMapHeader2ByConstant(text, constant)
	})
	.then(function (header) {
		return header.label
	})
}
