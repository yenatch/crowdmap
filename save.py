import os

def main(data):
	# TODO let the server resolve the filename
	filename = data['filename']
	filename = os.path.join(os.path.dirname(__file__), filename)

	extension = os.path.splitext(filename)[1]
	if extension == '.blk':
		content = data['data']
		if type(content) is list:
			content = bytearray(content)
		with open(filename, 'wb') as out:
			out.write(content)
	else:
		raise NotImplementedError
