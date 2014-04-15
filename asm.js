// Functions to parse map asm.


/*
var map_constants = constants(loadTextFile(tld + 'constants/map_constants.asm'));

var mapHeaders = loadTextFile(asm_dir + 'map_headers.asm');
var secondMapHeaders = loadTextFile(asm_dir + 'second_map_headers.asm');
var spriteHeaders = loadTextFile(ow_dir + 'sprite_headers.asm');
*/

function separateComment(line) {
	var in_quote = false;
	for (var i = 0; i < line.length; i++) {
		if (!in_quote) {
			if (line[i] === ';') {
				return [line.substr(0,i), line.substr(i)];
			}
		}
		if (line[i] === '"') in_quote = !in_quote;
	}
	return [line, undefined];
}

function asmAtLabel(asm, label) {
	var start = asm.indexOf(label + ':') + (label+':').length;
	var lines = asm.substr(start).split('\n');
	var content = [];
	for (var l = 0; l < lines.length; l++) {
		var line = lines[l];
		if (line.indexOf(':') !== -1) break;
		content.push(separateComment(line));
	}
	return content;
}


function macroValues(asm, macro) {
	var values = asm.substr(asm.indexOf(macro)+macro.length).split(',');
	for (var i = 0; i < values.length; i++) {
		values[i] = values[i].replace('$','0x').trim();
	}
	return values;
}

function dbValue(asm) {
	return asm.substr(asm.indexOf('db ')+3).replace('$','0x');
}

function dbValues(asm) {
	return macroValues(asm, 'db');
}



function constants(asm) {
	var consts = {};
	var lines = asm.split('\n');
	for (var l = 0; l < lines.length; l++) {
		var line = separateComment(lines[l])[0];
		if (line.indexOf('EQU') !== -1) {
			var con = line.split('EQU')[0].trim();
			var val = line.split('EQU')[1].trim();
			consts[con] = parseInt(val.replace('$','0x'));
			if (consts[con] === NaN) {
				consts[con] = consts[val];
			}
		}
	}
	return consts;
}

function getMapConstant(con) {
	var val = map_constants[con];
	if (val === undefined) return con;
	return val;
}

function secondMapHeader(asm, mapName) {
	var header = asmAtLabel(asm, mapName + '_SecondMapHeader');
	var items = [];
	var macros = [ 'db', 'db', 'dbw', 'dbw', 'dw', 'db' ];
	var attributes = [
		'border_block',
		'height',
		'width',
		'blockdata_bank',
		'blockdata_label',
		'script_header_bank',
		'script_header_label',
		'map_event_header_label',
		'connections',
	];
	var i = 0;
	for (var l = 0; l < header.length; l++) {
		var asm     = header[l][0];
		var comment = header[l][1];

		if (asm.trim() !== '') {
			items = items.concat(macroValues(asm, macros[i]));
			i++;
		}
		if (items.length === attributes.length) {
			l++;
			break;
		}
	}

	var attrs = listsToDict(attributes, items);
	attrs['connections'] = connections(attrs['connections'], header.slice(l));
	return attrs;
}


function connections(conns, header) {
	var directions = { 'north': {}, 'south': {}, 'west': {}, 'east': {} };
	
	var macros = [ 'db', 'dw', 'dw', 'db', 'db', 'dw' ];
	var attributes = [
		'map_group',
		'map_no',
		'strip_pointer',
		'strip_destination',
		'strip_length',
		'map_width',
		'y_offset',
		'x_offset',
		'window'
	];

	for (d in directions) {
		if (conns.search(d.toUpperCase()) !== -1) {
			var i = 0;
			var items = [];
			for (var l = 0; l < header.length; l++) {
				var asm     = header[l][0];
				var comment = header[l][1];

				if (asm.trim() !== '') {
					items = items.concat(macroValues(asm, macros[i]));
					i++;
				}
				if (items.length === attributes.length) {
					l++;
					break;
				}
			}
			directions[d] = listsToDict(attributes, items);
		}
	}

	return directions;
}

function mapHeader(asm, mapName) {
	var header = asmAtLabel(asm, mapName + '_MapHeader');
	var macros = [ 'db', 'dw', 'db' ];
	var items = [];
	var attributes = [
		'bank',
		'tileset_id',
		'permission',
		'second_map_header',
		'world_map_location',
		'music',
		'time_of_day',
		'fishing_group'
	];
	var i = 0;
	for (var l = 0; l < header.length; l++) {
		var asm     = header[l][0];
		var comment = header[l][1];

		if (asm.trim() !== '') {
			items = items.concat(macroValues(asm, macros[i]));
			i++;
		}
		if (items.length === attributes.length) {
			l++;
			break;
		}
	}
	return listsToDict(attributes, items);
}

function readHeader(header, classes) {
	var objects = {};
	var l = 0;
	for (var i in classes) {
		objects[i] = [];
		var count = -1;
		while (l < header.length) {
			var asm     = header[l][0];
			var comment = header[l][1];

			if (asm.trim() !== '') {
				if (count === -1) {
					count = parseInt(dbValue(asm));
					if (count === 0) {
						l++;
						break;
					}
				} else if (objects[i].length < count) {
					objects[i].push(new classes[i](asm));
				} else {
					break;
				}
			}
			l++;
		}
	}
	return objects;
}

function scriptHeader(asm, mapName) {
	var header = asmAtLabel(asm, mapName + '_MapScriptHeader');
	var classes = {
		triggers: Trigger,
		callbacks: Callback
	};
	return readHeader(header, classes);
}

var Trigger = function(asm) {
	return macroValues(asm, 'dw');
}

var Callback = function(asm) {
	return macroValues(asm, 'dbw');
}

function eventHeader(asm, mapName) {
	var header = asmAtLabel(asm, mapName + '_MapEventHeader');
	var classes = {
		unknown: function(){}, // "filler"
		warp_def: Warp,
		xy_trigger: XYTrigger,
		signpost: Signpost,
		person_event: PersonEvent
	};
	return readHeader(header, classes);
}

var Warp = function(asm) {
	var attributes = [
		'y',
		'x',
		'warp_id',
		'map_group',
		'map_no'
	];
	var values = macroValues(asm, 'warp_def');
	for (var i = 0; i < attributes.length; i++) {
		this[attributes[i]] = values[i];
	}
}

var XYTrigger = function(asm) {
        var attributes = [
        	'number',
        	'y',
        	'x',
        	'unknown1',
        	'script',
        	'unknown2',
        	'unknown3'
        ];
	var values = macroValues(asm, 'xy_trigger');
	for (var i = 0; i < attributes.length; i++) {
		this[attributes[i]] = values[i];
	}
}

var Signpost = function(asm) {
	var attributes = [
		'y',
		'x',
		'function',
		'pointer',
	];
	var values = macroValues(asm, 'signpost');
	for (var i = 0; i < attributes.length; i++) {
		this[attributes[i]] = values[i];
	}
}

var PersonEvent = function(asm) {
	var attributes = [
		'pic',
		'y',
		'x',
		'facing',
		'movement',
		'clock_hour',
		'clock_daytime',
		'color_function',
		'sight_range',
		'script_label',
		'bit_no'
	];
	var values = macroValues(asm, 'person_event');
	for (var i = 0; i < attributes.length; i++) {
		this[attributes[i]] = values[i];
	}
}

var pksv = {
	jumptextfaceplayer: readTextAt
}

function parseScriptAt(oasm, label) {
	var asm = asmAtLabel(oasm, label);
	var lines = [];
	for (var l = 0; l < asm.length; l++) {
		var line = asm[l][0].trim();
		if (line !== '') {
			var cmd = line.split(' ')[0];
			if (pksv[cmd]) {
				var result = pksv[cmd](oasm, macroValues(line, cmd)[0]);
				lines.push(result);
			}
		}
	}
	return lines.join('\n');
}

function readTextAt(asm, label) {
	var asm = asmAtLabel(asm, label);
	var text = ''
	var line;
	for (var l = 0; l < asm.length; l++) {
		line = asm[l][0].trim();
		line = line;
		text += line + '\n';
	}
	return text.trim();
}

function asmTextToHTML(text) {
	text = text
		.replace(/(\n)+/g, '<br>')
		.replace(/\btext "/g, '')
		.replace(/\bpara "/g, '')
		.replace(/\bline "/g, '')
		.replace(/\bnext "/g, '')
		.replace(/\bcont "/g, '')
		.replace(/\bdone\b/g, '')
		.replace(/\bdb /g,'')
		.replace(/\$0/g,'')
		.replace(/\$4f/g, '')
		.replace(/\$51/g, '')
		.replace(/\$57/g, '')
		.replace(/\$55/g, '')
		.replace(/,/g, '')
		.replace(/"/g, '')
	;
	return text;
}


function readSpriteHeaders(){
	var lines   = spriteHeaders.split('\n');
	var headers = [];
	var header  = {};
	console.log(lines);
	var line;
	var values_1, values_2, values_3;
	var l = 0;
	var values;
	l, values = read_line(lines, l, 'dw');
	l, values = read_line(lines, l, 'db');
	l, values = read_line(lines, l, 'db');
	for (var l = 0; l < lines.length; l++) {
		console.log(l, lines.length);
		line = separateComment(lines[l])[0];
		if (line.indexOf(':') !== -1) {
			if (header) headers.push(header);
			l++;
			line = separateComment(lines[l])[0];
		}
		values_1 = macroValues(line, 'dw');
		l++;
		line = separateComment(lines[l])[0];
		values_2 = macroValues(line, 'db');
		l++;
		line = separateComment(lines[l])[0];
		values_3 = macroValues(line, 'db');
		l++;
		header = {
			gfx_addr: values_1[0],
			tile_len: values_2[0],
			bank:     values_2[1],
			walk:     values_3[0],
			pal:      values_3[1],
		};
	}
	if (header) headers.push(header);
	console.log(headers);
	return headers;
}

function getSpriteImage(sprite) {
	var path = '';
	//asmAtLabel
	return path;
}

