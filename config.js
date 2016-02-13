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
	getPalmapPath: function (id) { return root + 'tilesets/' + zfill(this.getTilesetId(id), 2) + '_palette_map.bin' },
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


function has_macro (line, macro) {
	var re = new RegExp('\\b' + macro + '\\b')
	return (line.trim().search(re) !== -1)
}

function read_macro (line, macro) {
	var index = line.indexOf(macro) + macro.length
	var values = line.substr(index).split(',')
	values = values.map(rgbasm_parse)
	if (values.filter(function (value) { return value !== '' }).length === 0) {
		return []
	}
	return values
}

function read_macros (lines) {
	var macros = []
	for (var l = 0; l < lines.length; l += 1) {
		var line = lines[l][0].trim();
		if (line) {
			var macro_name = line.split(/\s+/)[0]
			var values = read_macro(line, macro_name)
			macros.push({macro: macro_name, values: values})
		}
	}
	return macros
}

function read_list (macros) {
	var values = []
	while (values.length === 0) {
		values = macros.shift().values
	}
	var count = values[0]
	var list = []
	for (var i = 0; i < count; i++) {
		list.push(macros.shift().values)
	}
	return list
}

function read_named_list (macros, names) {
	var list = read_list(macros)
	var objects = []
	for (var i = 0; i < list.length; i++) {
		var object = {}
		for (var j = 0; j < names.length; j++) {
			var name = names[j]
			object[name] = list[i][j]
		}
		objects.push(object)
	}
	return objects
}

function read_npcs(macros) {
	var npcs = read_named_list(macros, [
		'sprite',
		'y',
		'x',
		'movement',
		'radius_y',
		'radius_x',
		'clock_hour',
		'clock_daytime',
		'color',
		'function',
		'sight_range',
		'script',
		'event_flag'
	])
	npcs.forEach(function (npc) {
		//npc.x -= 4
		//npc.y -= 4
	})
	return npcs
}

function read_warps(macros) {
	var warps = read_named_list(macros, [
		'y', 'x',
		'map_warp',
		'map',
	])
	warps.forEach(function (warp) {
		warp.image_path = 'warp.png'
	})
	return warps
}

function read_signs(macros) {
	var signs = read_named_list(macros, [
		'y', 'x',
		'function',
		'script',
	])
	signs.forEach(function (sign) {
		sign.image_path = 'sign.png'
	})
	return signs
}

function read_traps(macros) {
	var traps = read_named_list(macros, [
		'trigger',
		'y', 'x',
		'unknown1',
		'script',
		'unknown2',
		'unknown3',
	])
	traps.forEach(function (trap) {
		trap.image_path = 'trap.png'
	})
	return traps
}

function read_filler(macros) {
	var values = []
	while (values.length < 2) {
		values = values.concat(macros.shift().values)
	}
	return values
}

function readEventText (text, map_name) {
	var lines = asmAtLabel(text, map_name + '_MapEventHeader')
	var macros = read_macros(lines)
	
	var filler = read_filler(macros)
	var warps = read_warps(macros)
	var traps = read_traps(macros)
	var signs = read_signs(macros)
	var npcs = read_npcs(macros)

	var obj_groups = [[warps, 'warp'], [traps, 'trap'], [signs, 'sign'], [npcs, 'npc']]
	obj_groups.forEach(
		function (stuff) {
			var objs = stuff[0]
			var className = stuff[1]
			objs.forEach(function (npc) {

				if (typeof npc.element === 'undefined') {
					npc.element = createElement('div')
				}
				npc.element.className = className

				if (className !== 'npc') {
					npc.element.style.opacity = '0.7'
				}
				if (npc.image_path) {
					npc.element.style.background = 'url(' + npc.image_path + ')'
				}

				npc.element.style.width = '16px'
				npc.element.style.height = '16px'
				npc.element.style.position = 'absolute'
			})
		}
	)

	var all_obj = [].concat(npcs, warps, traps, signs)
	all_obj.forEach(function (npc) {
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

	return getSpriteConstants().then(function(constants) {
		for (var i = 0; i < npcs.length; i++) {
			var npc = npcs[i]
			npc.sprite_id = constants[npc.sprite] - 1
			var sprite_id = npc.sprite_id >= 0 && npc.sprite_id <= 102 ? npc.sprite_id : 0
			npc.image_path = root + 'gfx/overworld/' + sprite_id.toString().zfill(3) + '.png'
		}
	})
	.then(function () {
		return {
			warps: warps,
			traps: traps,
			signs: signs,
			npcs: npcs,
		}
	})
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

function rgbasm_parse(value) {
	value = value.trim()
	rgbasm_value = parseInt(value.replace('$', '0x'))
	if (!isNaN(rgbasm_value)) {
		value = rgbasm_value
	}
	return value
}

function read_constants(text) {
	var constants = {}
	var lines = text.split('\n')
	for (var l = 0; l < lines.length; l++) {
		var line = separateComment(lines[l])[0]

		var index = line.search(/\bEQU\b/)
		if (index !== -1) {
			var key = line.substr(0, index).trim()
			var value = line.substr(index + 'EQU'.length).trim()
			constants[key] = rgbasm_parse(value)
		}
		var index = line.search(/=/)
		if (index !== -1) {
			var key = line.substr(0, index).trim()
			var value = line.substr(index + '='.length).trim()
			constants[key] = rgbasm_parse(value)
		}
		var index = line.search(/set/i)
		if (index !== -1) {
			var key = line.substr(0, index).trim()
			var value = line.substr(index + 'set'.length).trim()
			constants[key] = rgbasm_parse(value)
		}

		var index = line.search(/\bconst_def\b/)
		if (index !== -1) {
			constants.const_value = 0
		}
		var index = line.search(/\bconst\b/)
		if (index !== -1) {
			var key = line.substr(index + 'const'.length).trim()
			var value = constants.const_value
			constants.const_value += 1
			constants[key] = value
		}
	}
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
