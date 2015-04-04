// console tools

function fill(block, map) {
	map = map || view.current_map
	map.blockdata = []
	map_length = map.width * map.height
	for (var i = 0; i < map_length; i++) {
		map.blockdata.push(block)
	}
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

function resize(width, height, filler, map) {
	// Blockdata should probably be a 2d array so this function doesn't have to exist.

	map = map || view.current_map
	filler = filler || 1

	var last_w = map.width
	var last_h = map.height
	map.width = width
	map.height = height

	if (last_w === width && last_h === height) return

	if (last_w < width) {
		var blockdata = []
		for (var y = 0; y < last_h; y++) {
			var start = y * last_w
			blockdata.concat(map.blockdata.slice(start, start + last_w))
			for (var x = last_w; x < width; x++) {
				blockdata.push(filler)
			}
		}
		map.blockdata = blockdata
	} else if (last_w > width) {
		var blockdata = []
		for (var y = 0; y < last_h; y++) {
			var start = y * last_w
			blockdata.concat(map.blockdata.slice(start, start + width))
		}
		map.blockdata = blockdata
	}
	if (last_h < height) {
		for (var y = last_h; y < height; y++)
		for (var x = 0; x < width; x++) {
			map.blockdata.push(filler)
		}
	} else if (last_h > height) {
		map.blockdata = map.blockdata.slice(0, width * height)
	}

}

function newblk(path, id) {
}

function newmap(w, h, name, id) {
}
