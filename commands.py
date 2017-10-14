import os

def get_path(filename):
	return os.path.abspath(os.path.join(os.path.dirname(__file__), filename))

def read(data):
	path = get_path(data['path'])

	if data.get('options', {}).get('binary'):
		return list(bytearray(open(path, 'rb').read()))

	return open(path, 'r').read()

def write(data):
	path = get_path(data['path'])

	content = data.get('data')
	if content:
		if type(content) is list:
			content = bytearray(content)

		if type(content) is bytearray:
			with open(path, 'wb') as out:
				out.write(content)
		else:
			with open(path, 'w') as out:
				out.write(content.encode('utf-8'))

		print ('wrote {}'.format(path))

	else:
		raise Exception("Unable to write to '{}'".format(path))

commands = {
	'read': read,
	'write': write,
}

def main(data):
	command = data.get('command')
	function = commands.get(command)
	if function:
		return function(data)
