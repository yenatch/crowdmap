var rgbasm = function () {
	var self = this
	self.repts = []
	self.history = []
	self.queue = []
	self.macros = {
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
	self.read = function (text) {
		var lines = text.split('\n').map(separateComment)
		var queue = read_macros(lines)
		self.queue = queue.concat(self.queue)
		while (self.queue.length) {
			var macro = self.queue.shift()
			self.history.push(macro)
			var values = macro.values.slice()
			var name = macro.macro
			var macro_function = self.macros[name]
			if (macro_function) {
				var result = macro_function(values)
				if (typeof result !== 'undefined') {
					return result
				}
			}
		}
	}
}
