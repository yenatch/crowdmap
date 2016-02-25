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

	roofs: [ -1, 3, 2, -1, 1, 2, -1, -1, 2, 2, 1, 4, -1, -1, -1, -1, -1, -1, -1, 0, -1, -1, 3, -1, 0, -1, 0 ],
	//roof_permissions: [ 1, 'TOWN', 2, 'ROUTE', 4, 'CAVE' ], // wrong, see roof_tilesets
	roof_tilesets: [
		1, 'TILESET_JOHTO_1',
		2, 'TILESET_JOHTO_2',
		4, 'TILESET_BATTLE_TOWER_OUTSIDE',
	],
	roof_start: 0xa,

	tilesets: [
		undefined,
		'TILESET_JOHTO_1',
		'TILESET_JOHTO_2',
		'TILESET_KANTO',
		'TILESET_BATTLE_TOWER_OUTSIDE',
		'TILESET_HOUSE_1',
		'TILESET_KRISS_HOUSE',
		'TILESET_POKECENTER',
		'TILESET_GATE',
		'TILESET_PORT',
		'TILESET_LAB',
		'TILESET_POWER_PLANT',
		'TILESET_MART',
		'TILESET_CELADON_MANSION',
		'TILESET_GAME_CORNER',
		'TILESET_GYM_1',
		'TILESET_KURT_HOUSE',
		'TILESET_TRAIN_STATION',
		'TILESET_OLIVINE_GYM',
		'TILESET_LIGHTHOUSE',
		'TILESET_KRISS_HOUSE_2F',
		'TILESET_POKECOM_CENTER',
		'TILESET_BATTLE_TOWER',
		'TILESET_SPROUT_TOWER',
		'TILESET_CAVE',
		'TILESET_PARK',
		'TILESET_RUINS_OF_ALPH',
		'TILESET_RADIO_TOWER',
		'TILESET_UNDERGROUND',
		'TILESET_ICE_PATH',
		'TILESET_WHIRL_ISLANDS',
		'TILESET_ILEX_FOREST',
		'TILESET_32',
		'TILESET_HO_OH_WORD_ROOM',
		'TILESET_KABUTO_WORD_ROOM',
		'TILESET_OMANYTE_WORD_ROOM',
		'TILESET_AERODACTYL_WORD_ROOM',
	],
	getTilesetId: function (name) {
		var index = config.tilesets.indexOf(name)
		if (index != -1) {
			return index
		}
		return name
	},

	// not used, but probably should be instead of hardcoding tilesets above
	/*
	getTilesetConstants: function () {
		return request('constants/tilemap_constants.asm')
		.then(read_constants)
		.then(function (constants) {
			var filtered = {}
			for (constant in constants) {
				if (constant.search(/^TILESET_/) !== -1) {
					filtered[constant] = constants[constant]
				}
			}
			return filtered
		})
	},
	getTilesetId: function (name) {
		return getTilesetConstants()
		.then(function (constants) {
			return constants[name]
		})
	},
	*/

	getTilesetImagePath: function (id) { return root + 'gfx/tilesets/' + zfill(this.getTilesetId(id), 2) + '.png' },
	getBlockdataPath: function (name) { return root + 'maps/' + name + '.blk' },
	getMetatilePath: function (id) { return root + 'tilesets/' + zfill(this.getTilesetId(id), 2) + '_metatiles.bin' },
	getPalmapPath: function (id) { return root + 'tilesets/' + zfill(this.getTilesetId(id), 2) + '_palette_map.asm' },
	getPalettePath: function () { return root + 'tilesets/bg.pal' },
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

}


function named_args(names, values) {
	var object = {}
	names.forEach(function (key) {
		object[key] = values.shift()
	})
	return object
}

function readEventText (text) {
	var r = rgbasm.instance()
	var objects = {}
	function add_macro (name, real_name, arg_names) {
		if (typeof objects[real_name] === 'undefined') {
			objects[real_name] = []
		}
		r.macros[name] = function (values) {
			objects[real_name].push(named_args(arg_names, values))
		}
	}
	add_macro('warp_def', 'warp', ['y', 'x', 'map_warp', 'map'])
	add_macro('xy_trigger', 'trap', ['trigger', 'y', 'x', 'unknown1', 'script', 'unknown2', 'unknown3'])
	add_macro('signpost', 'sign', ['y', 'x', 'function', 'script'])
	add_macro('person_event', 'npc', ['sprite', 'y', 'x', 'movement', 'radius_y', 'radius_x', 'clock_hour', 'clock_daytime', 'color', 'function', 'sight_range', 'script', 'event_flag'])

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
		})
		all_obj.concat(npcs)
	})

	all_obj.forEach(function (npc) {
		// Make events draggable.
		var dragging = false
		npc.element.addEventListener('mousedown', function (event) {
			dragging = true
		})
		document.addEventListener('mousemove', function (event) {
			if (dragging) {
				var rect = npc.element.getBoundingClientRect()
				var x = event.clientX - rect.left
				if (x < 0) x -= 16
				x = (x - (x % 16)) / 16
				var y = event.clientY - rect.top
				if (y < 0) y -= 16
				y = (y - (y % 16)) / 16
				npc.x += x
				npc.y += y
			}
		})
		document.addEventListener('mouseup', function (event) {
			dragging = false
		})
	})

	all_obj.forEach(function (npc) {
		// Have a grabby hand when moving npcs around.
		npc.element.style.webkitUserSelect = 'none'
		npc.element.style.mozUserSelect = 'none'
		npc.element.style.cursor = '-webkit-grab'
		var last_cursor
		npc.element.addEventListener('mousedown', function (event) {
			npc.element.style.cursor = '-webkit-grabbing'
			last_cursor = document.body.style.cursor
			document.body.style.cursor = '-webkit-grabbing'
		})
		document.addEventListener('mouseup', function (event) {
			npc.element.style.cursor = '-webkit-grab'
			document.body.style.cursor = last_cursor
		})
		npc.element.addEventListener('drag', function (event) {
			event.preventDefault()
		})
	})

	all_obj.forEach(function (npc) {
		// Show the coordinates of the npc you're moving around.
		var info = createElement('div', { className: 'coordinates', })
		var update = function (event) {
			info.innerHTML = '(' + npc.x + ', ' + npc.y + ')'
			info.style.left = event.pageX + 'px'
			info.style.top = event.pageY + 'px'
		}
		addDragInfo(npc.element, info, update)
	})

	var warps = objects.warps
	warps.forEach(function (warp) {
		// We're stuck with the map constant, so we can only approximate the corresponding label.
		// This seems to work for the majority of maps.
		var map_name = warp.map.title().replace(/_/g, '')
		map_name = map_name.replace(/pokecenter/ig, 'PokeCenter')

		// Right click on a warp to go to the destination map.
		warp.element.addEventListener('contextmenu', function (event) {
			event.preventDefault()
			console.log('warp to ' + map_name)
			gotoMap(map_name)
		})

		// Hover over a warp to show the destination map.
		var info = createElement('div', { className: 'warp_info', })
		info.innerHTML = map_name
		var update = function (event) {
			info.style.left = event.pageX + 'px'
			info.style.top = event.pageY + 'px'
		}
		addHoverInfo(warp.element, info, update)
	})

	var npcs = objects.npcs
	getSpriteConstants().then(function(constants) {
		for (var i = 0; i < npcs.length; i++) {
			var npc = npcs[i]
			npc.sprite_id = constants[npc.sprite] - 1
			var sprite_id = npc.sprite_id >= 0 && npc.sprite_id <= 102 ? npc.sprite_id : 0
			npc.image_path = root + 'gfx/overworld/' + sprite_id.toString().zfill(3) + '.png'
		}
	})

	return objects
}

config.readEvents = function (map_name) {
	return request(root + 'maps/' + map_name + '.asm')
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

function addHoverInfo(target, div, update) {
	target.addEventListener('mouseenter', function (event) {
		update(event)
		document.body.appendChild(div)
		document.body.addEventListener('mousemove', update)
		function self (event) {
			document.body.removeChild(div)
			document.body.removeEventListener('mousemove', update)
			document.body.removeEventListener('mouseenter', self)
			target.removeEventListener('mouseout', self)
		}
		document.body.addEventListener('mouseenter', self)
		target.addEventListener('mouseout', self)
	})
}

function addDragInfo(target, div, update) {
	target.addEventListener('mousedown', function (event) {
		update(event)
		document.body.appendChild(div)
		document.body.addEventListener('mousemove', update)
		document.body.addEventListener('mouseup', function self (event) {
			document.body.removeChild(div)
			document.body.removeEventListener('mousemove', update)
			document.body.removeEventListener('mouseup', self)
		})
	})
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
	names.sort()
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
		group = groups.indexOf(line.label)
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
