var rgbasm = {

	init: function () {
		var self = this
		this.repts = []
		this.history = []
		this.queue = []
		this.infix = {}
		this.callbacks = {}
		this.macros = {
			rept: function (values) {
				self.repts.push({
					num: values.shift(),
					i: self.history.length,
				})
			},
			endr: function (values) {
				var rept = self.repts.pop()
				var history = self.history.slice(rept.i, self.history.length - 1)
				var queue = []
				for (var i = 0; i < rept.num - 1; i++) {
					queue = history.concat(queue)
				}
				self.queue = queue.concat(self.queue)
			},
		}
		return this
	},

	instance: function () {
		return Object.create(this).init()
	},

	read: function (text) {
		var lines = text.split('\n')
		var queue = this.read_macros(lines)
		this.queue = queue.concat(this.queue)
		while (this.queue.length) {
			var result = this.read_line()
			if (typeof result !== 'undefined') {
				return result
			}
		}
	},

	read_line: function () {
		var line = this.queue.shift()
		this.history.push(line)
		if (line.label) {
			var callback = this.callbacks.label
			if (callback) {
				result = callback(line)
				if (result) {
					return result
				}
			}
		}
		var macro = this.macros[line.macro]

		// Labels are mutually exclusive to infix, so we don't need to check if there's both. I think.
		if (!macro) {
			macro = this.infix[line.values[0]]
			if (macro) {
				var m = line.values.shift()
				line.values.unshift(line.macro)
				line.macro = m
			}
		}
		if (!macro) {
			macro = this.infix[line.macro]
			if (macro) {
				line.values.unshift(line.label)
				line.label = ''
			}
		}
		if (!macro) {
			macro = this.macros[line.label]
			if (macro) {
				line.values.unshift(line.macro)
				line.macro = line.label
				line.label = ''
			}
		}
		var values = line.values.map(this.eval.bind(this))
		if (macro) {
			return macro(values, line)
		}
	},

	eval: function (value) {
		if (value) {
			value = value.toString()
			value = value.trim()
			var int_value = parseInt(value.replace('$', '0x'))
			if (!isNaN(int_value)) {
				value = int_value
			}
		}
		return value
	},

	read_macro: function (line) {
		var original_line = line.replace(/\n$/, '') + '\n'

		line = this.separate_comment(line)
		var comment = line.comment
		line = line.line

		var tokens = line.match(/^([a-zA-Z\._]*[a-zA-Z0-9\._#@]*:*)\s*([\S^:]*)\s*(.*)/) || []
		var label = tokens[1] || ''
		var macro = tokens[2] || ''
		var values = tokens[3] || ''
		values = values.split(/,/)

		if (label) {
			label = label.replace(/:+/, '')
		}

		return {
			label: label,
			macro: macro,
			values: values,
			line: line,
			comment: comment,
			original_line: original_line,
		}
	},

	read_macros: function (lines) {
		return lines.map(this.read_macro.bind(this))
	},

	separate_comment: function (line) {
		var in_quote = false
		var comment = ''
		for (var i = 0; i < line.length; i++) {
			if (line[i] === '"') {
				in_quote = !in_quote
			}
			if (!in_quote && line[i] === ';') {
				comment = line.substring(i)
				line = line.substring(0, i)
				break
			}
		}
		return {
			line: line,
			comment: comment,
		}
	},

}
