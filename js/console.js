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

	var map_name = etc.map || view.current_map
	var map = Data.maps[map_name]

	var last_w = map.width
	var last_h = map.height
	var width  = x2 - x1
	var height = y2 - y1

	if (last_w === width && last_h === height) return
	if ((width + 6) * (height + 6) > config.max_blocks) {
		if (!etc.override) {
			console.log("map can't be more than " + config.max_blocks + " blocks! (including border)")
			return
		}
	}

	var filler = etc.filler
	if (typeof filler === 'undefined') {
		filler = view.paint_block
		if (typeof filler === 'undefined') {
			filler = map.attributes.border_block
		}
	}

	var blk = []
	for (var y = y1; y < y2; y++)
	for (var x = x1; x < x2; x++) {
		if ((x >= 0 && x < last_w) && (y >= 0 && y < last_h)) {
			blk.push(getBlock(map_name, x, y))
		} else {
			blk.push(filler)
		}
	}

	map.blockdata = blk
	map.width = width
	map.height = height

	for (var type in map.events) {
		var events = map.events[type]
		for (var i = 0; i < events.length; i++) {
			var event = events[i]
			event.x -= x1 * 2
			event.y -= y1 * 2
		}
	}

	for (var direction in map.attributes.connections) {
		var connection = map.attributes.connections[direction]
		if (direction === 'north' || direction === 'south') {
			connection.align -= x1
		} else {
			connection.align -= y1
		}
	}

}

function resize(width, height, filler, map) {
	crop(0, 0, width, height, {map:map, filler:filler})
}

function newblk(path, id) {
}

function newmap(w, h, name, id) {
}
