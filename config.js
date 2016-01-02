var root = '../'

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

	roofs: [ -1, 3, 2, -1, 1, 2, -1, -1, 2, 2, 1, 4, -1, -1, -1, -1, -1, -1, -1, 0, -1, -1, 3, -1, 0, -1, 0 ],
	//roof_permissions: [ 1, 'TOWN', 2, 'ROUTE', 4, 'CAVE' ], // wrong, see roof_tilesets
	roof_tilesets: [1, 2, 4],
	roof_start: 0xa,

	getTilesetImagePath: function (id) {
		var path = this.tiles_dir + id.toString().zfill(2) + '.png'
		path = addQuery(path, Date.now())
		return path
	},

	getBlockdataPath: function (name) {
		return this.blockdata_dir + name + '.blk'
	},

	getMetatilePath: function (id) {
		return this.metatiles_dir + id.toString().zfill(2) + '_metatiles.bin'
	},

	getPalmapPath: function (id) {
		return this.palmap_dir + id.toString().zfill(2) + '_palette_map.bin'
	},

	getRoofImagePath: function (group) {
		var roof = this.roofs[group]
		if (roof === -1 || typeof roof === 'undefined') {
			roof = 0
		}
		var path = this.tiles_dir + 'roofs/' + roof + '.png'
		return path
	},

	getPalettePath: function (id) {
		var path = this.palette_dir + 'bg.pal'
		return path
	},

	getRoofPalettePath: function () {
		var path = this.palette_dir + 'roof.pal'
		return path
	},

	default_map_header: {
		label: '',
		tileset: 1,
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

function read_macros (lines) {
	var macros = []
	for (var l = 0; l < lines.length; l += 1) {
		var line = lines[l][0].trim();
		if (line) {
			var macro_name = line.split(/\s+/)[0]
			var values = macroValues(line, macro_name)
			macros.push({macro: macro_name, values: values})
		}
	}
	return macros
}

function read_list (macros) {
	var count = macros.shift().values[0]
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
	return npcs
}

function read_warps(macros) {
	var warps = read_named_list(macros, [
		'y', 'x',
		'map_warp',
		'map_group',
		'map_num',
	])
	warps.forEach(function (warp) {
		warp.x = rgbasm_parse(warp.x) + 4
		warp.y = rgbasm_parse(warp.y) + 4
		warp.image_path = 'warp.png'
	})
	return warps
}

function readEventText (text, map_name) {
	var lines = asmAtLabel(text, map_name + '_MapEventHeader')
	var macros = read_macros(lines)
	
	var filler = macros.shift().values
	var warps = read_warps(macros)
	var traps = read_list(macros)
	var signs = read_list(macros)
	var npcs = read_npcs(macros)

	return getMapConstants().then(function(map_constants) {
		for (var i = 0; i < npcs.length; i++) {
			var npc = npcs[i]
			npc.sprite_id = map_constants[npc.sprite] - 1
			var sprite_id = npc.sprite_id >= 0 && npc.sprite_id <= 102 ? npc.sprite_id : 0
			npc.image_path = addQuery(root + 'gfx/overworld/' + sprite_id.toString().zfill(3) + '.png', Date.now())
		}

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

					npc.element.style.opacity = '0.7'
					if (npc.image_path) {
						npc.element.style.background = 'url(' + npc.image_path + ')'
					}

					npc.element.style.width = '16px'
					npc.element.style.height = '16px'
					npc.element.style.left = parseInt(npc.x) * 16 + 32 + 'px'
					npc.element.style.top = parseInt(npc.y) * 16 + 32 + 'px'
					npc.element.style.position = 'absolute'
				})
			}
		)

		warps.forEach(function (warp) {
			warp.element.addEventListener('contextmenu', function (event) {
				event.preventDefault()
				// We're stuck with the map constant, so we can only approximate the corresponding label.
				// This seems to work for the majority of maps.
				var map_name = warp.map_num.substr(4).title().replace(/_/g, '')
				map_name = map_name.replace(/pokecenter/ig, 'PokeCenter')
				console.log('warp to ' + map_name)
				gotoMap(map_name)
			})
		})

	}).then(function () {
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

function getMapConstants() {
	return getMapConstantsText().then(read_constants)
}

function rgbasm_parse(value) {
	rgbasm_value = parseInt(value.replace('$', '0x'))
	if (!isNaN(rgbasm_value)) {
		value = rgbasm_value
	}
	return value
}

function read_constants(text) {
	var constants = {}
	var const_value = 0
	var lines = text.split('\n')
	for (var l = 0; l < lines.length; l++) {
		var line = separateComment(lines[l])[0]

		var index = line.search(/\bEQU\b/)
		if (index !== -1) {
			var key = line.substr(0, index).trim()
			var value = line.substr(index + 'EQU'.length).trim()
			constants[key] = rgbasm_parse(value)
		}
		var index = line.search(/\bconst_def\b/)
		if (index !== -1) {
			const_value = 0
		}
		var index = line.search(/\bconst\b/)
		if (index !== -1) {
			var key = line.substr(index + 'const'.length).trim()
			var value = const_value
			const_value += 1
			constants[key] = value
		}
	}
	return constants
}

/*

function eventHeader(asm, mapName) {
	var header = asmAtLabel(asm, mapName + '_MapEventHeader');
	var classes = {
		unknown: function(){}, // "filler"
		warp_def: Warp,
		xy_trigger: XYTrigger,
		signpost: Signpost,
		person_event: PersonEvent
	};
	return readHeader(header, classes);
}

var Warp = function(asm) {
	var attributes = [
		'y',
		'x',
		'warp_id',
		'map_group',
		'map_no'
	];
	var values = macroValues(asm, 'warp_def');
	for (var i = 0; i < attributes.length; i++) {
		this[attributes[i]] = values[i];
	}
}

var XYTrigger = function(asm) {
        var attributes = [
        	'number',
        	'y',
        	'x',
        	'unknown1',
        	'script',
        	'unknown2',
        	'unknown3'
        ];
	var values = macroValues(asm, 'xy_trigger');
	for (var i = 0; i < attributes.length; i++) {
		this[attributes[i]] = values[i];
	}
}

var Signpost = function(asm) {
	var attributes = [
		'y',
		'x',
		'function',
		'pointer',
	];
	var values = macroValues(asm, 'signpost');
	for (var i = 0; i < attributes.length; i++) {
		this[attributes[i]] = values[i];
	}
}

var PersonEvent = function(asm) {
	var attributes = [
		'pic',
		'y',
		'x',
		'facing',
		'movement',
		'clock_hour',
		'clock_daytime',
		'color_function',
		'sight_range',
		'script_label',
		'bit_no'
	];
	var values = macroValues(asm, 'person_event');
	for (var i = 0; i < attributes.length; i++) {
		this[attributes[i]] = values[i];
	}
}

*/
