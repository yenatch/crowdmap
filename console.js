// console tools

function fill(block, map) {
	map = map || view.current_map
	map.blockdata = []
	map_length = map.width * map.height
	for (var i = 0; i < map_length; i++) {
		map.blockdata.push(block)
	}
	view.commit()
}

function tileset(id, map) {
	map = map || view.current_map
	map.map_header.tileset = id
	map.reloadTileset()
	.then(function () {
		view.redraw = true
		picker.redraw = true
	})
}

function crop(x1, y1, x2, y2, etc) {
	etc = etc || {}

	var map = etc.map || view.current_map

	var last_w = map.width
	var last_h = map.height
	var width  = map.width  = x2 - x1
	var height = map.height = y2 - y1

	if (last_w === width && last_h === height) return

	var filler = etc.filler
	if (typeof filler === 'undefined') {
		filler = view.paint_block
		if (typeof filler === 'undefined') {
			filler = view.current_map.map_header_2.border_block
		}
	}

	var blk = []
	for (var y = y1; y < y2; y++)
	for (var x = x1; x < x2; x++) {
		if ((x >= 0 && x < last_w) && (y >= 0 && y < last_h)) {
			blk.push(map.blockdata[last_w * y + x])
		} else {
			blk.push(filler)
		}
	}

	map.blockdata = blk

	if (map === view.current_map) {
		view.commit()
		view.redraw = true
	}
}

function resize(width, height, filler, map) {
	crop(0, 0, width, height, {map:map, filler:filler})
}

function newblk(path, id) {
}

function newmap(w, h, name, id) {
}
