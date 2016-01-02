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
		var path = config.palette_dir + 'bg.pal'
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
