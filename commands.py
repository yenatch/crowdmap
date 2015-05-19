import os

def save(data):
	filename = data.get('filename')
	filename = os.path.join(os.path.dirname(__file__), filename)

	extension = os.path.splitext(filename)[1]
	if extension == '.blk':
		content = data.get('data')
		if content:
			if type(content) is list:
				content = bytearray(content)
			with open(filename, 'wb') as out:
				out.write(content)
	else:
		raise NotImplementedError

commands = {
	'save': save,
}

def main(data):
	command = data.get('command')
	function = commands.get(command)
	if function:
		function(data)
