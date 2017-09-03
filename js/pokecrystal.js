var Versions = {}

Versions.pokecrystal = {

	add_map: function (properties) {
		var self = this

		var width = properties.width || 20
		var height = properties.height || 20
		var default_block = properties.default_block
		var blockdata = properties.blockdata

		if (!defined(default_block)) {
			default_block = 1
		}
		if (!defined(blockdata)) {
			blockdata = []
			for (var i = 0; i < width * height; i++) {
				blockdata.push(default_block)
			}
		}

		var map_name = properties.label
			.replace(/([^A-Z_])([A-Z])/g, function (match, a, b) {
				return match.replace(a + b, a + '_' + b)
			})
			.replace(/([^0-9A-Z_])([0-9])()/g, function (match, a, b) {
				return match.replace(a + b, a + '_' + b)
			})
			.toUpperCase()

		var dir = config.root_path
		var paths = Settings.value('paths')
		var map_path = Path.join(paths.map_data, properties.label + '.blk')
		var script_path = Path.join(paths.map_data, properties.label + '.asm')


		var promises = []

		promises.push(
			File.readAsync(Path.join(dir, paths.map_header))
			.then(function (text) {
				var data = self.readMapHeaders(text)

				if (!data.groups.contains(properties.group)) {
					data.groups.push(properties.group)
				}
				if (!data.map_headers[properties.group]) {
					data.map_headers[properties.group] = []
				}
				data.map_headers[properties.group].push([
					properties.label,
					properties.header.tileset,
					properties.header.permission,
					properties.header.location,
					properties.header.music,
					properties.header.lighting,
					properties.header.fish,
				])

				return data
			})
		)

		promises.push(
			File.readAsync(Path.join(dir, paths.map_header_2))
			.then(function (text) {
				var data = self.readMapHeaders2(text)

				data.maps.push([
					properties.label,
					map_name,
					properties.header_2.border_block,
					'NONE'
				])
				data.connections[properties.label] = []

				return data
			})
		)

		promises.push(
			File.readAsync('resources/app/map_event_template.asm')
			.then(function (text) {
				return text.replace('/\{label\}/g', properties.label)
			})
		)

		promises.push(promises[0].then(function (data) {
			return File.readAsync(Path.join(dir, paths.map_constants))
			.then(function (text) {
				if (!data.groups.contains(properties.group)) {
					return text
				}
				var group_id = data.groups.indexOf(properties.group) + 1

				var r = rgbasm.instance()
				var groups = []
				r.macros.newgroup = function (values, line) {
					groups.push({
						map_id: 0,
						line_num: line.line_num + 1,
					})
				}
				r.macros.mapgroup = function (values, line) {
					var group = groups.last()
					if (group) {
						group.map_id += 1
						group.line_num = line.line_num + 1
					}
				}
				r.read(text)

				var lines = text.split('\n')

				var group = groups[group_id - 1]
				var line_num = 0
				var map_id = 1

				if (defined(group)) {
					line_num = group.line_num
					map_id = group.map_id
				} else {
					if (groups.last()) {
						line_num = groups.last().line_num
					}
					lines.insert(line_num, '\n\tnewgroup' + ' ; ' + group_id + '\n')
					line_num += 1
				}

				lines.insert(
					line_num,
					'\tmapgroup ' + [map_name, width, height].join(', ') + ' ; ' + map_id
				)

				text = lines.join('\n')
				if (text[text.length - 1] !== '\n') {
					text += '\n'
				}
				return text
			})
		}))

		promises.push(
			File.readAsync(Path.join(dir, paths.map_includes))
			.then(function (text) {
				var lines = [
					'\n',
					'SECTION "' + properties.label + '", ROMX',
					'INCLUDE "' + script_path + '"',
					'',
					'SECTION "' + properties.label + '_BlockData", ROMX',
					properties.label + '_BlockData:',
					'INCBIN "' + map_path + '"',
				]
				return text + lines.join('\n') + '\n'
			})
		)

		return Promise.all(promises)
		.then(function (data) {
			var map_headers = data[0]
			var map_headers_2 = data[1]
			var script = data[2]
			var constants = data[3]
			var includes = data[4]

			map_headers.text = self.serializeMapHeaders(map_headers)
			map_headers_2.text = self.serializeMapHeaders2(map_headers_2)
			return Promise.all([
				File.writeAsync(Path.join(dir, map_path), blockdata, { binary: true }),
				File.writeAsync(Path.join(dir, script_path), script),
				File.writeAsync(Path.join(dir, paths.map_header), map_headers.text),
				File.writeAsync(Path.join(dir, paths.map_header_2), map_headers_2.text),
				File.writeAsync(Path.join(dir, paths.map_constants), constants),
				File.writeAsync(Path.join(dir, paths.map_includes), includes),
			])
		})
	},

	readMapHeaders: function (text) {
		var groups = []
		var r = rgbasm.instance()
		r.macros.dw = function (values) {
			groups = groups.concat(values)
		}
		r.read(text)

		var group
		var map_headers = []
		var r = rgbasm.instance()
		r.callbacks.label = function (line) {
			group = line.label
			if (!map_headers[group]) {
				map_headers[group] = []
			}
		}
		r.macros.map_header = function (values) {
			map_headers[group].push(values)
		}
		r.read(text)

		return {
			groups: groups,
			map_headers: map_headers,
		}
	},

	readMapHeaders2: function (text) {
		var maps = []
		var connections = []

		var label
		var r = rgbasm.instance()
		r.macros.map_header_2 = function (values) {
			label = values[0]
			maps.push(values)
			if (!connections[label]) {
				connections[label] = []
			}
		}
		r.macros.connection = function (values) {
			connections[label].push(values)
		}
		r.read(text)

		return {
			maps: maps,
			connections: connections,
		}
	},

	serializeMapHeaders: function (data) {
		var lines = []
		lines.push('MapGroupPointers::')
		data.groups.forEach(function (group) {
			lines.push('\tdw ' + group)
		})
		data.groups.forEach(function (group) {
			lines.push('\n')
			lines.push(group + ':')
			data.map_headers[group].forEach(function (map) {
				lines.push('\tmap_header ' + map.join(', '))
			})
		})
		return lines.join('\n') + '\n'
	},

	serializeMapHeaders2: function (data) {
		var lines = []
		data.maps.forEach(function (map) {
			lines.push('\tmap_header_2 ' + map.join(', '))
			var label = map[0]
			data.connections[label].forEach(function (connection) {
				lines.push('\tconnection ' + connection.join(', '))
			})
			if (data.connections[label].length) {
				lines.push('')
			}
		})
		return lines.join('\n') + '\n'
	}

}
