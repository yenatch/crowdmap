
// console tools
function fill(tile_id, map) {
	map == map || controller.painters[0].map;
	map.blockdata = '';
	var map_len = map.width * map.height;
	for (var i=0; i < map_len; i++) {
		map.blockdata += String.fromCharCode(tile_id|0);
	}
	map.draw();
}

function tileset(tileset_id, map) {
	map == map || controller.painters[0].map;
	var old_blk = map.blockdata;
	controller.painters[0] = new Painter(
		getCustomMap(map.id, map.name, map.width, map.height, tileset_id)
	);
	map.blockdata = old_blk;
	controller.picker = new Picker(map);
}

function resize(width, height, filler_tile, map) {
	map == map || controller.painters[0].map;
	filler_tile = (filler_tile || 1) | 0;

	var last_width = map.width;
	var last_height = map.height;
	if (last_width === width && last_height === height) return;

	var blk = map.blockdata;

	if (last_width < width) {
		// append filler tiles to each row
		var rows = []
		for (var row = 0; row < last_height; row++) {
			rows.push(blk.substr(last_width * row, last_width));
		}
		blk = ''
		for (var r = 0; r < rows.length; r++) {
			for (var i = 0; i < (width - last_width); i++) {
				rows[r] += String.fromCharCode(filler_tile);
			}
			blk += rows[r]
		}
	} else if (last_width > width) {
		// remove tiles from each row
		var rows = []
		for (var row = 0; row < last_height; row++) {
			rows.push(blk.substr(last_width * row, width));
		}

	} else if (last_width > width) {
		// remove tiles from each row
		var rows = []
		for (var row = 0; row < last_height; row++) {
			rows.push(blk.substr(last_width * row, width));
		}
		blk = ''
		for (r=0;r<rows.length;r++) {
			blk += rows[r]
		}
	}

	if (last_height < height) {
		// append filler rows to the bottom
		for (var row = 0; row < (height - last_height); row++) {
			for (var i=0; i < width; i++) {
				blk += String.fromCharCode(filler_tile);
			}
		}
	} else if (last_height > height) {
		// remove rows from the bottom
		blk = blk.substr(0, width * height);
	}

	controller.painters[0] = new Painter(getCustomMap(controller.painters[0].map.id, controller.painters[0].map.name, width, height, controller.painters[0].map.tileset_id));
	controller.painters[0].map.blockdata = blk;
	controller.painters[0].map.draw();
}

function newblk(path, id) {
	id = id || 0;
	var w = controller.painters[id].map.width;
	var h = controller.painters[id].map.height;
	var t = controller.painters[id].map.tileset_id;
	controller.painters[id] = new Painter(getCustomMap(id, undefined, w, h, t, path));
	controller.painters[id].map.draw();
}

function newmap(w, h, name, id) {
	id = id || 0;
	w  = w  || 20;
	h  = h  || 20;
	controller.painters[id] = new Painter(getCustomMap(id, undefined, w, h));
	controller.picker = new Picker(controller.painters[id].map);
}



