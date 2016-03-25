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
				callback(line)
			}
		}
		var macro = this.macros[line.macro]
		if (!macro) {
			macro = this.infix[line.macro]
			if (macro) {
				if (line.label) {
					line.values.unshift(line.label)
					line.label = undefined
				}
			}
		}
		if (!macro) {
			macro = this.infix[line.values.shift()]
			line.values.unshift(line.macro)
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
		var label = (line.match(/^[a-zA-Z\._][a-zA-Z0-9#@\._]*:*/) || [])[0]
		var macro = (line.substr(label ? label.length : 0).match(/\S+/) || [])[0]
		var values = []
		if (macro) {
			var index = line.indexOf(macro) + macro.length
			values = line.substr(index).split(/,/)
		}
		if (label) {
			label = label.replace(/:+/, '')
		}

		return {
			label: label,
			macro: macro,
			values: values,
			line: line,
			comment: line.comment,
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
				comment = line.substr(i)
				line = line.substr(0, i)
				break
			}
		}
		line.comment = comment
		return line.replace(/\n$/, '') + '\n'
	},

}
