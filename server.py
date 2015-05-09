"""Run from the parent directory."""

import SimpleHTTPServer
import SocketServer
import sys
import json
import os
import imp

try:
	PORT = int(sys.argv[1])
except:
	PORT = 8000

def import_module(path):
	# return __import__(path)
	module_name = os.path.splitext(os.path.basename(path))[0]
	return imp.load_source(module_name, path)


class Handler(SimpleHTTPServer.SimpleHTTPRequestHandler):

	def do_POST(self):
		"""
		Receives json and passes it into an entry point of some module.
		"""
		length = int(self.headers.getheader('content-length'))
		data = self.rfile.read(length)

		# stupid hack to get past filler
		boundary = data.split()[0]
		data = data.split(boundary)[1]
		data = data[data.find('\r\n\r\n')+4:]

		parsed_data = json.loads(data)

		path = self.translate_path(self.path)
		module = import_module(path)
		module.main(parsed_data)

		self.wfile.write('ok')
		print '"POST {}"'.format(path)

def main():
	pass # nice try

def run():
	try:
		httpd = SocketServer.TCPServer(("", PORT), Handler)
		print "serving at port", PORT
		httpd.serve_forever()
	except KeyboardInterrupt:
		print 'port', PORT, 'closed'

if __name__ == '__main__':
	run()
