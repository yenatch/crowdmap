import os

def get_path(filename):
	return os.path.join(os.path.dirname(__file__), filename)

def save(data):
	filename = data.get('filename')
	filename = get_path(filename)

	extension = os.path.splitext(filename)[1]
	content = data.get('data')
	if content:
		if type(content) is list:
			content = bytearray(content)
		if type(content) is bytearray:
			with open(filename, 'wb') as out:
				out.write(content)
		else:
			with open(filename, 'w') as out:
				out.write(content.encode('utf-8'))
		print 'save {}'.format(filename)
	else:
		raise Exception("Unable to save '{}'".format(filename))

def add_map(data):
	label = data['label']
	group = data['group']
	header = data['header']
	header_2 = data['header_2']
	width = data['width']
	height = data['height']

	map_name = label.upper()

	header_line = '\tmap_header ' + ', '.join(map('{}'.format, [
		label,
		header['tileset'],
		header['permission'],
		header['location'],
		header['music'],
		header['lighting'],
		header['fish'],
	]))
	header_2_line = '\tmap_header_2 ' + ', '.join(map('{}'.format, [
		label,
		map_name,
		header_2['border_block'],
		'NONE',
	]))

	root = './'

	path = root + 'maps/map_headers.asm'
	path_2 = root + 'maps/second_map_headers.asm'
	blk_path = root + 'maps/' + label + '.blk'
	constants_path = root + 'constants/map_constants.asm'
	script_path = root + 'maps/' + label + '.asm'
	include_path = root + 'maps.asm'

	text = open(path).read()
	text_2 = open(path_2).read()
	if label + ',' in text.split() or label + ',' in text_2.split():
		raise Exception, 'yeah nah {} is already a map or existing macro'.format(label)

	lines = text.split('\n')

	for i, line in enumerate(lines):
		words = line.split()
		group_no = 0
		if 'dw' in words:
			group_no += 1
			if group in words:
				break
	index = -1
	map_no = 0
	for i, line in enumerate(lines):
		if group + ':' in line:
			index = i + 1
			map_no = 1
		else:
			if index != -1:
				if ':' in line.split(';')[0]:
					break
				if line:
					index = i + 1
					map_no += 1

	lines.insert(index, header_line)
	new_text = '\n'.join(lines)

	lines_2 = text_2.split('\n')
	lines_2.append(header_2_line)
	new_text_2 = '\n'.join(lines_2) + '\n'

	blk = bytearray([1] * width * height)

	constants = open(constants_path).read()
	constants_lines = constants.split('\n')
	# find group
	g = 0
	i = 0
	for line in constants_lines:
		if line.strip().startswith('newgroup'):
			g += 1
			i = 0
		elif line.strip().startswith('mapgroup'):
			i += 1
			if g == group_no and i == map_no:
				break

	constants_lines.insert(i, '\tmapgroup {}, {}, {}'.format(map_name, height, width))

	new_constants = '\n'.join(constants_lines)

	script = open(get_path('map_event_template.asm')).read()
	script = script.format(label=label)

	include = open(include_path).read()
	include += '\n\n'
	include += (''
		+ 'SECTION "{label}", ROMX\n'
		+ 'INCLUDE "maps/{label}.asm"\n'
		+ 'SECTION "{label} Blockdata", ROMX\n'
		+ '{label}_BlockData: INCBIN "maps/{label}.blk"\n'
	).format(label=label)

	with open(path, 'w') as out:
		out.write(new_text)
	with open(path_2, 'w') as out:
		out.write(new_text_2)
	with open(blk_path, 'wb') as out:
		out.write(blk)
	with open(constants_path, 'w') as out:
		out.write(new_constants)
	with open(script_path, 'w') as out:
		out.write(script)
	with open(include_path, 'w') as out:
		out.write(include)

	print 'Added map {} to group {}'.format(data['label'], data['group'])

commands = {
	'save': save,
	'add_map': add_map,
}

def main(data):
	command = data.get('command')
	function = commands.get(command)
	if function:
		function(data)
