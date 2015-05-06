"""Run from the parent directory."""

import SimpleHTTPServer
import SocketServer
import sys
import json

try:
	PORT = int(sys.argv[1])
except:
	PORT = 8000

class Handler(SimpleHTTPServer.SimpleHTTPRequestHandler):

	def do_POST(self):
		"""
		Receives json and saves files on the server.
		"""
		length = int(self.headers.getheader('content-length'))
		data = self.rfile.read(length)

		# stupid hack to get past filler
		boundary = data.split()[0]
		data = data.split(boundary)[1]
		data = data[data.find('\r\n\r\n')+4:]

		parsed_data = json.loads(data)
		content = parsed_data['data']

		if type(content) is list:
			content = bytearray(content)

		filename = '.' + self.path
		with open(filename, 'w') as out: out.write(content)
		print 'saved', filename

		self.wfile.write('ok')

try:
	httpd = SocketServer.TCPServer(("", PORT), Handler)
	print "serving at port", PORT
	httpd.serve_forever()
except KeyboardInterrupt:
	print 'port', PORT, 'closed'
